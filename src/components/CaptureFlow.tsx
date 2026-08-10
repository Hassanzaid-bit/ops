"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AreaCaptureScreen } from "@/components/AreaCaptureScreen";
import { getAvailableAreas, getSite } from "@/lib/ops-store";
import { generateReport } from "@/lib/report";
import { upsertRecord } from "@/lib/records-store";
import { loadDraft, saveDraft } from "@/lib/storage";
import {
  allAreasComplete,
  emptyAreaInspection,
  emptyDeviceUnit,
  emptyRedDotUpdate,
  isAreaComplete,
  isDeviceArea,
  isFcuArea,
  isMonitoringDeviceArea,
  isRedDotArea,
  isRodentBaitArea,
  jobCoveragePercent,
  normalizeAreaInspection,
  normalizeDeviceService,
  normalizeTreatment,
  syncAreaDerivedFields,
  type AreaInspection,
  type ScheduledVisit,
  type Site,
  type VisitDraft,
} from "@/lib/types";
import { buildVisitRecord } from "@/lib/visit-record";
import { VISIT_TYPE_LABELS } from "@/lib/vocabulary";

/** Common areas techs add when the branch checklist is empty */
const VISIT_STARTER_AREAS = [
  "Red Dot Update",
  "Fly Control Units (FCUs)",
  "Non-Toxic Monitoring Stations",
  "Toxic Bait Stations",
] as const;

function starterAreasAvailable(existing: string[]) {
  const have = new Set(existing.map((a) => a.toLowerCase()));
  return VISIT_STARTER_AREAS.filter((name) => !have.has(name.toLowerCase()));
}

type Props = { visit: ScheduledVisit };
type Screen = "list" | "area" | "review";

export function CaptureFlow({ visit }: Props) {
  const router = useRouter();
  const [site, setSite] = useState<Site | null>(null);
  const [screen, setScreen] = useState<Screen>("list");
  const [activeArea, setActiveArea] = useState<string | null>(null);
  const [areaFilter, setAreaFilter] = useState("");
  const [draft, setDraft] = useState<VisitDraft>(() => ({
    visitId: visit.id,
    areas: [],
    updatedAt: new Date().toISOString(),
  }));
  const [hydrated, setHydrated] = useState(false);
  const [copyFlash, setCopyFlash] = useState(false);
  const [treatmentOn, setTreatmentOn] = useState(false);
  const [offlineSite, setOfflineSite] = useState(false);
  const [newAreaName, setNewAreaName] = useState("");
  const [addAreaHint, setAddAreaHint] = useState<string | null>(null);

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
        // Keep areas PMPs added mid-visit that aren't on the site template
        const extras = existing.areas
          .filter(
            (a) =>
              !areas.some(
                (name) => name.toLowerCase() === a.area.toLowerCase(),
              ),
          )
          .map((a) => normalizeAreaInspection(a, a.area));
        setDraft({
          visitId: visit.id,
          areas: [...merged, ...extras],
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
    return [
      ...incomplete.sort((a, b) => a.area.localeCompare(b.area)),
      ...complete.sort((a, b) => a.area.localeCompare(b.area)),
    ];
  }, [draft.areas]);

  const filteredAreas = useMemo(() => {
    const q = areaFilter.trim().toLowerCase();
    if (!q) return orderedAreas;
    return orderedAreas.filter((a) => a.area.toLowerCase().includes(q));
  }, [orderedAreas, areaFilter]);
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

  function addCustomArea(rawName: string) {
    const name = rawName.trim().replace(/\s+/g, " ");
    if (!name) {
      setAddAreaHint("Enter an area name.");
      return;
    }
    const existing = draft.areas.find(
      (a) => a.area.toLowerCase() === name.toLowerCase(),
    );
    if (existing) {
      setAddAreaHint(null);
      setNewAreaName("");
      openArea(existing.area);
      return;
    }
    let nextArea = emptyAreaInspection(name);
    if (isRedDotArea(name)) {
      nextArea = {
        ...nextArea,
        redDot: emptyRedDotUpdate(),
      };
    }
    if (isRodentBaitArea(name)) {
      nextArea = {
        ...nextArea,
        deviceService: normalizeDeviceService({
          enabled: true,
          units: [],
        }),
      };
    } else if (isFcuArea(name) || isMonitoringDeviceArea(name)) {
      nextArea = {
        ...nextArea,
        deviceService: normalizeDeviceService({
          enabled: true,
          units: isFcuArea(name) ? [] : [emptyDeviceUnit(1)],
        }),
      };
    }
    persist({
      ...draft,
      areas: [...draft.areas, nextArea],
      updatedAt: new Date().toISOString(),
    });
    setNewAreaName("");
    setAddAreaHint(null);
    setTreatmentOn(false);
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
    ).finally(() => {
      router.push("/");
    });
  }

  async function copyReport() {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = report;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopyFlash(true);
    setTimeout(() => setCopyFlash(false), 2000);
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
        "mx-auto flex min-h-full max-w-lg flex-col px-4",
        screen === "area" ? "pt-3 pb-8" : "pt-4 pb-28",
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
          <div className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
              Areas
            </h2>
            <input
              type="search"
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              placeholder={
                draft.areas.length === 0
                  ? "Type an area to add (e.g. Lobby, FCU)…"
                  : "Filter areas…"
              }
              className="min-h-11 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--ink-muted)] focus:border-[var(--accent)]"
            />
          </div>

          {!areaFilter.trim() && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addCustomArea(newAreaName);
              }}
              className="space-y-2 rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-3"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                Add area for this visit
              </p>
              <div className="flex flex-wrap gap-2">
                <input
                  value={newAreaName}
                  onChange={(e) => {
                    setNewAreaName(e.target.value);
                    if (addAreaHint) setAddAreaHint(null);
                  }}
                  placeholder="e.g. Receiving drain, Staff canteen…"
                  className="min-h-11 min-w-[12rem] flex-1 rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                />
                <button
                  type="submit"
                  className="min-h-11 rounded-lg bg-[var(--ink)] px-4 text-sm font-semibold text-[var(--bg)]"
                >
                  + Add
                </button>
              </div>
              {addAreaHint && (
                <p className="text-xs font-medium text-red-800" role="alert">
                  {addAreaHint}
                </p>
              )}
              <p className="text-xs text-[var(--ink-muted)]">
                Adds to this visit only — does not change the branch checklist
                template.
              </p>
            </form>
          )}

          <ul className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)]">
            {filteredAreas.map((a) => {
                const done = isAreaComplete(a);
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
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "font-medium",
                          done ? "text-[var(--ok)]" : "text-[var(--ink)]",
                        ].join(" ")}
                      >
                        {done ? `${a.area} ✓` : a.area}
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
            {draft.areas.length === 0 && !areaFilter.trim() && (
              <li className="space-y-4 px-3 py-5">
                <div className="text-center">
                  <p className="text-sm font-medium text-[var(--ink)]">
                    No checklist on this branch yet
                  </p>
                  <p className="mt-1 text-sm text-[var(--ink-muted)]">
                    Add areas as you walk the site. Red Dot and monitoring
                    devices open specialized capture.
                  </p>
                </div>
                {starterAreasAvailable([]).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                      Start with
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {starterAreasAvailable([]).map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => addCustomArea(name)}
                          className="min-h-10 rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 text-left text-xs font-semibold text-[var(--ink)]"
                        >
                          + {name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            )}
            {draft.areas.length > 0 &&
              !areaFilter.trim() &&
              starterAreasAvailable(draft.areas.map((a) => a.area)).length >
                0 &&
              draft.areas.length < 4 && (
                <li className="border-t border-[var(--line)] px-3 py-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                    Also add
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {starterAreasAvailable(draft.areas.map((a) => a.area)).map(
                      (name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => addCustomArea(name)}
                          className="min-h-9 rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2.5 text-xs font-semibold text-[var(--ink)]"
                        >
                          + {name}
                        </button>
                      ),
                    )}
                  </div>
                </li>
              )}
            {filteredAreas.length === 0 && areaFilter.trim() && (
              <li className="space-y-3 px-3 py-5">
                <p className="text-center text-sm text-[var(--ink-muted)]">
                  No areas match “{areaFilter.trim()}”.
                </p>
                <div className="space-y-2 rounded-lg border border-dashed border-[var(--line)] bg-[var(--bg)] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                    Add area for this visit
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const name = areaFilter.trim();
                      addCustomArea(name);
                      setAreaFilter("");
                    }}
                    className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg bg-[var(--ink)] px-3 text-left text-sm font-semibold text-[var(--bg)]"
                  >
                    <span className="truncate">+ Add “{areaFilter.trim()}”</span>
                    <span className="shrink-0">Add</span>
                  </button>
                  <p className="text-xs text-[var(--ink-muted)]">
                    Adds to this visit only — does not change the branch
                    checklist template.
                  </p>
                  {addAreaHint && (
                    <p className="text-xs font-medium text-red-800" role="alert">
                      {addAreaHint}
                    </p>
                  )}
                </div>
              </li>
            )}
          </ul>
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
          {!draft.submittedAt && (
            <button
              type="button"
              onClick={() => setScreen("list")}
              className="text-sm font-medium text-[var(--accent-deep)]"
            >
              ← Back to areas
            </button>
          )}
          <h2 className="text-lg font-semibold text-[var(--ink)]">
            Review report
          </h2>
          <p className="text-sm text-[var(--ink-muted)]">
            Fully auto-generated from your taps — no retyping.
          </p>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 text-sm leading-relaxed text-[var(--ink)]">
            {report}
          </pre>
          {draft.submittedAt ? (
            <button
              type="button"
              onClick={() => void copyReport()}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-ink)]"
            >
              {copyFlash ? "Copied" : "Copy report"}
            </button>
          ) : (
            <button
              type="button"
              onClick={submitLocal}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-ink)]"
            >
              Save report
            </button>
          )}
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

    </div>
  );
}
