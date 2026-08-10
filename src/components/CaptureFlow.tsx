"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AreaPickerModal } from "@/components/AreaPickerModal";
import { AreaCaptureScreen } from "@/components/AreaCaptureScreen";
import { getAvailableAreas, getSite } from "@/lib/ops-store";
import { generateReport } from "@/lib/report";
import { upsertRecord } from "@/lib/records-store";
import { clearDraft, loadDraft, saveDraft } from "@/lib/storage";
import {
  allAreasComplete,
  emptyAreaInspection,
  isAreaComplete,
  isDeviceArea,
  isRedDotArea,
  jobCoveragePercent,
  normalizeAreaInspection,
  normalizeTreatment,
  syncAreaDerivedFields,
  type AreaInspection,
  type ScheduledVisit,
  type Site,
  type VisitDraft,
} from "@/lib/types";
import { buildVisitRecord } from "@/lib/visit-record";
import { VISIT_TYPE_LABELS } from "@/lib/vocabulary";

type Props = { visit: ScheduledVisit };
type Screen = "list" | "area" | "review";

export function CaptureFlow({ visit }: Props) {
  const [site, setSite] = useState<Site | null>(null);
  const [checklist, setChecklist] = useState<string[]>([]);
  const [screen, setScreen] = useState<Screen>("list");
  const [activeArea, setActiveArea] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draft, setDraft] = useState<VisitDraft>(() => ({
    visitId: visit.id,
    areas: [],
    updatedAt: new Date().toISOString(),
  }));
  const [hydrated, setHydrated] = useState(false);
  const [copyFlash, setCopyFlash] = useState<string | null>(null);
  const [treatmentOn, setTreatmentOn] = useState(false);
  const [offlineSite, setOfflineSite] = useState(false);

  const persist = useCallback((next: VisitDraft) => {
    setDraft(next);
    void saveDraft(next);
  }, []);

  useEffect(() => {
    void (async () => {
      const [loadedSite, areas, existing] = await Promise.all([
        getSite(visit.siteId),
        getAvailableAreas(visit),
        loadDraft(visit.id),
      ]);
      setSite(loadedSite ?? null);
      setOfflineSite(!loadedSite && !navigator.onLine);
      setChecklist(areas);

      if (existing?.areas?.length) {
        const byName = new Map(
          existing.areas.map((a) => [
            a.area,
            normalizeAreaInspection(a, a.area),
          ]),
        );
        const merged = areas.map(
          (name) => byName.get(name) ?? emptyAreaInspection(name),
        );
        setDraft({
          visitId: visit.id,
          areas: merged,
          updatedAt: existing.updatedAt,
          submittedAt: existing.submittedAt,
        });
        if (existing.submittedAt) setScreen("review");
      } else {
        setDraft({
          visitId: visit.id,
          areas: areas.map((a) => emptyAreaInspection(a)),
          updatedAt: new Date().toISOString(),
        });
      }
      setHydrated(true);
    })();
  }, [visit]);

  const completedCount = draft.areas.filter(isAreaComplete).length;
  const totalCount = draft.areas.length;
  const coveragePercent = jobCoveragePercent(draft.areas);
  const remainingAreas = draft.areas.filter((a) => !isAreaComplete(a));
  const canReview = allAreasComplete(draft.areas);
  const orderedAreas = useMemo(() => {
    const incomplete = draft.areas.filter((a) => !isAreaComplete(a));
    const complete = draft.areas.filter(isAreaComplete);
    const rank = (a: AreaInspection) => (isRedDotArea(a.area) ? 0 : 1);
    return [
      ...incomplete.sort((a, b) => rank(a) - rank(b) || a.area.localeCompare(b.area)),
      ...complete.sort((a, b) => rank(a) - rank(b) || a.area.localeCompare(b.area)),
    ];
  }, [draft.areas]);
  const assignmentLabel =
    visit.assignmentMode === "team"
      ? `Team · lead ${visit.technicianName}${(visit.teamMemberIds?.length ?? 0) > 1 ? ` · ${(visit.teamMemberIds?.length ?? 1)} PMPs` : ""}`
      : `Solo · ${visit.technicianName}`;

  const current = useMemo(() => {
    if (!activeArea) return null;
    const found = draft.areas.find((a) => a.area === activeArea);
    return found
      ? normalizeAreaInspection(found, found.area)
      : emptyAreaInspection(activeArea);
  }, [activeArea, draft.areas]);

  function updateArea(areaName: string, patch: Partial<AreaInspection>) {
    const areas = draft.areas.map((a) => {
      if (a.area !== areaName) return a;
      const base = normalizeAreaInspection(a, a.area);
      return syncAreaDerivedFields({ ...base, ...patch, area: areaName });
    });
    persist({ ...draft, areas });
  }

  function openArea(name: string) {
    const insp = draft.areas.find((a) => a.area === name);
    const normalized = insp
      ? normalizeAreaInspection(insp, name)
      : emptyAreaInspection(name);
    setTreatmentOn(
      normalizeTreatment(normalized.treatment).applications.some(
        (a) => a.product,
      ),
    );
    setActiveArea(name);
    setScreen("area");
  }

  function submitLocal() {
    if (!canReview || !site) return;
    const submittedAt = new Date().toISOString();
    const next = { ...draft, submittedAt };
    persist(next);
    void upsertRecord(
      buildVisitRecord(visit, site, draft.areas, submittedAt),
    ).then(({ synced }) => {
      setCopyFlash(
        synced
          ? "Report saved"
          : "Saved offline — will sync when connected",
      );
      setTimeout(() => setCopyFlash(null), 2500);
    });
  }

  const report = useMemo(
    () => (site ? generateReport(visit, site, draft.areas) : ""),
    [visit, site, draft.areas],
  );

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 text-[var(--ink-muted)]">
        Loading visit…
      </div>
    );
  }

  if (!site) {
    return (
      <div className="mx-auto max-w-lg space-y-3 px-4 py-10">
        <p className="text-[var(--ink)]">
          {offlineSite
            ? "This job isn’t available offline yet. Open it once while online to cache the checklist."
            : "Site details for this job could not be loaded."}
        </p>
        <Link href="/" className="text-[var(--accent-deep)]">
          ← Today&apos;s jobs
        </Link>
      </div>
    );
  }

  return (
    <div
      className={[
        "mx-auto flex min-h-full max-w-lg flex-col px-4 pb-28",
        screen === "area" ? "pt-3" : "pt-4",
      ].join(" ")}
    >
      {screen !== "area" && (
        <header className="mb-5 space-y-2">
          <Link
            href="/"
            className="inline-flex min-h-10 items-center text-sm font-medium text-[var(--accent-deep)]"
          >
            ← Today&apos;s jobs
          </Link>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-deep)]">
                {VISIT_TYPE_LABELS[visit.visitType]} · {visit.date}
              </p>
              <h1 className="mt-1 text-2xl font-semibold leading-tight text-[var(--ink)]">
                {site.siteName}
              </h1>
              <p className="text-sm text-[var(--ink-muted)]">{site.clientName}</p>
              <p className="text-xs text-[var(--ink-muted)]">{assignmentLabel}</p>
            </div>
            {screen === "list" && (
              <div className="w-[9.5rem] shrink-0 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-2">
                <p className="text-[11px] font-semibold leading-snug text-[var(--ink)]">
                  {coveragePercent}% coverage
                </p>
                <p className="text-[11px] text-[var(--ink-muted)]">
                  {completedCount} of {totalCount} done
                </p>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--line)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent)] transition-[width]"
                    style={{
                      width: `${coveragePercent}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </header>
      )}

      {screen === "list" && (
        <main className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
              Areas
            </h2>
            {totalCount >= 8 && (
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="text-sm font-semibold text-[var(--accent-deep)]"
              >
                Search
              </button>
            )}
          </div>

          <ul className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)]">
            {orderedAreas.map((a) => {
                const done = isAreaComplete(a);
                const redDot = isRedDotArea(a.area);
                return (
                  <li
                    key={a.area}
                    className="border-b border-[var(--line)] last:border-0"
                  >
                    <button
                      type="button"
                      onClick={() => openArea(a.area)}
                      className={[
                        "flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm",
                        done ? "bg-[var(--ok-soft)]/50" : "",
                        redDot && !done ? "bg-[var(--warn-soft)]/40" : "",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "font-medium",
                          done ? "text-[var(--ok)]" : "text-[var(--ink)]",
                        ].join(" ")}
                      >
                        {done ? `${a.area} ✓` : a.area}
                        {redDot ? (
                          <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--warn)]">
                            Start here
                          </span>
                        ) : null}
                      </span>
                      <span
                        className={[
                          "shrink-0 font-semibold",
                          done
                            ? "text-[var(--ok)]"
                            : "text-[var(--accent)]",
                        ].join(" ")}
                      >
                        {done ? "Edit" : "Open"}
                      </span>
                    </button>
                  </li>
                );
              })}
            {draft.areas.length === 0 && (
              <li className="px-3 py-8 text-center text-sm text-[var(--ink-muted)]">
                No areas on this checklist.
              </li>
            )}
          </ul>

          <AreaPickerModal
            open={pickerOpen}
            areas={draft.areas.map((a) => ({
              name: a.area,
              done: isAreaComplete(a),
            }))}
            onClose={() => setPickerOpen(false)}
            onSelect={(name) => {
              setPickerOpen(false);
              openArea(name);
            }}
          />
        </main>
      )}

      {screen === "area" && current && activeArea && (
        <AreaCaptureScreen
          insp={current}
          showDevices={isDeviceArea(activeArea) || current.deviceService.enabled}
          treatmentOn={treatmentOn}
          onTreatmentOnChange={setTreatmentOn}
          onChange={(patch) => updateArea(activeArea, patch)}
          onBack={() => {
            setScreen("list");
            setActiveArea(null);
          }}
        />
      )}

      {screen === "review" && (
        <main className="space-y-4">
          <button
            type="button"
            onClick={() => setScreen("list")}
            className="text-sm font-medium text-[var(--accent-deep)]"
          >
            ← Back to areas
          </button>
          <h2 className="text-lg font-semibold text-[var(--ink)]">
            Review report
          </h2>
          <p className="text-sm text-[var(--ink-muted)]">
            Fully auto-generated from your taps — no retyping.
          </p>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 text-sm leading-relaxed text-[var(--ink)]">
            {report}
          </pre>
          <button
            type="button"
            onClick={submitLocal}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-ink)]"
          >
            {draft.submittedAt ? "Save report again" : "Save report"}
          </button>
          <button
            type="button"
            className="text-sm text-[var(--ink-muted)] underline"
            onClick={() => {
              void clearDraft(visit.id);
              setDraft({
                visitId: visit.id,
                areas: checklist.map((a) => emptyAreaInspection(a)),
                updatedAt: new Date().toISOString(),
              });
              setScreen("list");
            }}
          >
            Reset draft
          </button>
        </main>
      )}

      {screen === "list" && (
        <nav className="fixed inset-x-0 bottom-0 border-t border-[var(--line)] bg-[var(--bg)]/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto max-w-lg">
            <button
              type="button"
              disabled={!canReview}
              onClick={() => setScreen("review")}
              className={[
                "flex min-h-11 w-full items-center justify-center rounded-lg text-sm font-semibold disabled:opacity-40",
                canReview
                  ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                  : "bg-[var(--ink)] text-[var(--bg)]",
              ].join(" ")}
            >
              {canReview
                ? "Review report"
                : remainingAreas.length === 1
                  ? "Finish 1 remaining"
                  : `Finish ${remainingAreas.length} remaining`}
            </button>
          </div>
        </nav>
      )}

      {copyFlash && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-[var(--ink)] px-4 py-2 text-sm font-medium text-[var(--bg)] shadow-lg">
          {copyFlash}
        </div>
      )}
    </div>
  );
}
