"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Chip, ChipGroup } from "@/components/Chip";
import { AreaPickerModal } from "@/components/AreaPickerModal";
import { getAvailableAreas, getSite } from "@/lib/ops-store";
import {
  generateInsectramBlock,
  generateReport,
  whatsappShareUrl,
} from "@/lib/report";
import { upsertRecord } from "@/lib/records-store";
import { clearDraft, loadDraft, saveDraft } from "@/lib/storage";
import {
  allAreasComplete,
  emptyAreaInspection,
  emptyTreatmentRow,
  isAreaComplete,
  isDeviceArea,
  normalizeAreaInspection,
  normalizeTreatment,
  type AreaInspection,
  type ScheduledVisit,
  type VisitDraft,
} from "@/lib/types";
import { buildVisitRecord } from "@/lib/visit-record";
import {
  ADVICE_OPTIONS,
  DEVICE_ACTIONS,
  DEVICE_COUNTS,
  FINDINGS,
  PEST_TYPE_GROUPS,
  PEST_TYPES,
  TREATMENT_APPLICATION_METHODS,
  TREATMENT_PRODUCT_NAMES,
  TREATMENT_QUANTITIES,
  VISIT_TYPE_LABELS,
  getTreatmentCatalogItem,
} from "@/lib/vocabulary";

type Props = { visit: ScheduledVisit };
type Screen = "list" | "area" | "review";

export function CaptureFlow({ visit }: Props) {
  const site = getSite(visit.siteId)!;
  const checklist = getAvailableAreas(visit);

  const [screen, setScreen] = useState<Screen>("list");
  const [activeArea, setActiveArea] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draft, setDraft] = useState<VisitDraft>(() => ({
    visitId: visit.id,
    areas: checklist.map((a) => emptyAreaInspection(a)),
    updatedAt: new Date().toISOString(),
  }));
  const [hydrated, setHydrated] = useState(false);
  const [copyFlash, setCopyFlash] = useState<string | null>(null);
  const [treatmentOn, setTreatmentOn] = useState(false);

  const persist = useCallback((next: VisitDraft) => {
    setDraft(next);
    saveDraft(next);
  }, []);

  useEffect(() => {
    const areas = getAvailableAreas(visit);
    const existing = loadDraft(visit.id);
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
  }, [visit.id, visit]);

  const completedCount = draft.areas.filter(isAreaComplete).length;
  const totalCount = draft.areas.length;
  const remainingAreas = draft.areas.filter((a) => !isAreaComplete(a));
  const canReview = allAreasComplete(draft.areas);

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
      return { ...base, ...patch, area: areaName };
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
    if (!canReview) return;
    const submittedAt = new Date().toISOString();
    const next = { ...draft, submittedAt };
    persist(next);
    upsertRecord(buildVisitRecord(visit, site, draft.areas, submittedAt));
    setCopyFlash("Saved to records");
    setTimeout(() => setCopyFlash(null), 2500);
  }

  async function copyText(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFlash(`${label} copied`);
    } catch {
      setCopyFlash("Copy failed");
    }
    setTimeout(() => setCopyFlash(null), 2000);
  }

  const report = useMemo(
    () => generateReport(visit, site, draft.areas),
    [visit, site, draft.areas],
  );
  const insectram = useMemo(
    () => generateInsectramBlock(visit, site, draft.areas),
    [visit, site, draft.areas],
  );

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 text-[var(--ink-muted)]">
        Loading visit…
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
            </div>
            {screen === "list" && (
              <div className="w-[9.5rem] shrink-0 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-2">
                <p className="text-[11px] font-semibold leading-snug text-[var(--ink)]">
                  {completedCount} of {totalCount} done
                </p>
                <p className="text-[11px] text-[var(--ink-muted)]">
                  {totalCount - completedCount} left
                </p>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--line)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent)] transition-[width]"
                    style={{
                      width: `${totalCount ? (completedCount / totalCount) * 100 : 0}%`,
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
            {[...remainingAreas, ...draft.areas.filter(isAreaComplete)].map(
              (a) => {
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
              },
            )}
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
          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => copyText("Report", report)}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--ink)] px-4 text-sm font-semibold text-[var(--bg)]"
            >
              Copy report
            </button>
            <a
              href={whatsappShareUrl(report)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--ink)]"
            >
              Share to WhatsApp
            </a>
            <button
              type="button"
              onClick={() => copyText("Insectram block", insectram)}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--ink)]"
            >
              Copy for Insectram
            </button>
            <button
              type="button"
              onClick={submitLocal}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-ink)]"
            >
              {draft.submittedAt ? "Resubmit to records" : "Submit to records"}
            </button>
            <Link
              href="/reports"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--ink)]"
            >
              Open management reports
            </Link>
          </div>
          <button
            type="button"
            className="text-sm text-[var(--ink-muted)] underline"
            onClick={() => {
              clearDraft(visit.id);
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

function AreaCaptureScreen({
  insp,
  showDevices,
  treatmentOn,
  onTreatmentOnChange,
  onChange,
  onBack,
}: {
  insp: AreaInspection;
  showDevices: boolean;
  treatmentOn: boolean;
  onTreatmentOnChange: (on: boolean) => void;
  onChange: (patch: Partial<AreaInspection>) => void;
  onBack: () => void;
}) {
  const treatment = normalizeTreatment(insp.treatment);
  const rows =
    treatment.applications.length > 0
      ? treatment.applications
      : treatmentOn
        ? [emptyTreatmentRow()]
        : [];

  function setRows(next: typeof rows) {
    onChange({
      treatment: {
        ...treatment,
        applications: next.some((r) => r.product) ? next : [],
      },
    });
  }

  const complete = isAreaComplete(insp);

  return (
    <main className="space-y-3 pb-8">
      <div className="space-y-1">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-[var(--accent-deep)]"
        >
          ← All areas
        </button>
        <h2 className="text-xl font-semibold text-[var(--ink)]">{insp.area}</h2>
      </div>

      <section className="space-y-2">
        <p className="text-sm font-medium text-[var(--ink-muted)]">Status</p>
        <div className="grid grid-cols-2 gap-2">
          <Chip
            label="Clean"
            selected={insp.status === "clean"}
            onClick={() =>
              onChange({
                status: "clean",
                findings: [],
                pestTypes: [],
              })
            }
          />
          <Chip
            label="Issues noted"
            selected={insp.status === "issues"}
            onClick={() => onChange({ status: "issues" })}
          />
        </div>
      </section>

      {insp.status && (
        <>
          {insp.status === "issues" && (
            <>
              <section className="space-y-2">
                <p className="text-sm font-medium text-[var(--ink-muted)]">
                  Findings
                </p>
                <ChipGroup
                  options={FINDINGS}
                  selected={insp.findings}
                  onChange={(findings) => onChange({ findings })}
                  searchable
                  placeholder="Search findings…"
                />
              </section>
              <section className="space-y-2">
                <p className="text-sm font-medium text-[var(--ink-muted)]">
                  Pest type (optional)
                </p>
                <ChipGroup
                  options={PEST_TYPES}
                  selected={insp.pestTypes}
                  onChange={(pestTypes) => onChange({ pestTypes })}
                  searchable
                  groups={PEST_TYPE_GROUPS}
                  placeholder="Search pest…"
                />
              </section>
            </>
          )}

          <section className="space-y-3">
            <p className="text-sm font-medium text-[var(--ink-muted)]">
              Treatment
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Chip
                label="None"
                selected={!treatmentOn}
                onClick={() => {
                  onTreatmentOnChange(false);
                  onChange({
                    treatment: { applications: [], serviceActions: [] },
                  });
                }}
              />
              <Chip
                label="Applied"
                selected={treatmentOn}
                onClick={() => {
                  onTreatmentOnChange(true);
                  if (treatment.applications.length === 0) {
                    onChange({
                      treatment: {
                        applications: [emptyTreatmentRow()],
                        serviceActions: [],
                      },
                    });
                  }
                }}
              />
            </div>

            {treatmentOn && (
              <div className="space-y-3">
                {rows.map((app, index) => (
                  <div
                    key={`tx-${index}`}
                    className="space-y-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3"
                  >
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <div className="min-w-0 space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                          Product
                        </p>
                        <ChipGroup
                          options={TREATMENT_PRODUCT_NAMES}
                          selected={app.product ? [app.product] : []}
                          onChange={(next) => {
                            const product = next[0] ?? "";
                            const cat = product
                              ? getTreatmentCatalogItem(product)
                              : undefined;
                            const updated = rows.map((row, i) =>
                              i === index
                                ? {
                                    product,
                                    method: "",
                                    quantity: "",
                                    activeIngredient:
                                      cat?.activeIngredient ?? "",
                                    antidote: cat?.antidote ?? "",
                                  }
                                : row,
                            );
                            setRows(updated);
                          }}
                          multi={false}
                          searchable
                          placeholder="Product…"
                        />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                          Method
                        </p>
                        <ChipGroup
                          options={TREATMENT_APPLICATION_METHODS}
                          selected={app.method ? [app.method] : []}
                          onChange={(next) => {
                            const method = next[0] ?? "";
                            setRows(
                              rows.map((row, i) =>
                                i === index ? { ...row, method } : row,
                              ),
                            );
                          }}
                          multi={false}
                          searchable
                          placeholder="Method…"
                        />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                          Qty
                        </p>
                        <ChipGroup
                          options={TREATMENT_QUANTITIES}
                          selected={app.quantity ? [app.quantity] : []}
                          onChange={(next) => {
                            const quantity = next[0] ?? "";
                            setRows(
                              rows.map((row, i) =>
                                i === index ? { ...row, quantity } : row,
                              ),
                            );
                          }}
                          multi={false}
                          searchable
                          placeholder="Qty…"
                        />
                      </div>
                    </div>
                    {rows.length > 1 && (
                      <button
                        type="button"
                        className="text-xs font-semibold text-[var(--ink-muted)]"
                        onClick={() =>
                          setRows(rows.filter((_, i) => i !== index))
                        }
                      >
                        Remove product
                      </button>
                    )}
                  </div>
                ))}
                {rows.every((r) => r.product && r.method && r.quantity) && (
                  <button
                    type="button"
                    className="text-sm font-semibold text-[var(--accent-deep)]"
                    onClick={() => setRows([...rows, emptyTreatmentRow()])}
                  >
                    + Add another product
                  </button>
                )}
              </div>
            )}
          </section>

          {showDevices && (
            <section className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-[var(--ink)]">
                  Device service
                </p>
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      deviceService: {
                        ...insp.deviceService,
                        enabled: !insp.deviceService.enabled,
                        count: insp.deviceService.enabled
                          ? ""
                          : insp.deviceService.count,
                        actions: insp.deviceService.enabled
                          ? []
                          : insp.deviceService.actions,
                      },
                    })
                  }
                  className={[
                    "min-h-10 rounded-lg px-3 text-sm font-semibold",
                    insp.deviceService.enabled
                      ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                      : "border border-[var(--line)] text-[var(--ink-muted)]",
                  ].join(" ")}
                >
                  {insp.deviceService.enabled ? "On" : "Off"}
                </button>
              </div>
              {insp.deviceService.enabled && (
                <>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                      Count
                    </p>
                    <ChipGroup
                      options={DEVICE_COUNTS}
                      selected={
                        insp.deviceService.count
                          ? [insp.deviceService.count]
                          : []
                      }
                      onChange={(next) =>
                        onChange({
                          deviceService: {
                            ...insp.deviceService,
                            count: next[0] ?? "",
                          },
                        })
                      }
                      multi={false}
                      searchable
                      placeholder="Count…"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                      Actions
                    </p>
                    <ChipGroup
                      options={DEVICE_ACTIONS}
                      selected={insp.deviceService.actions}
                      onChange={(actions) =>
                        onChange({
                          deviceService: {
                            ...insp.deviceService,
                            actions,
                          },
                        })
                      }
                    />
                  </div>
                </>
              )}
            </section>
          )}

          <section className="space-y-2">
            <div>
              <p className="text-sm font-medium text-[var(--ink-muted)]">
                Advice / next step
              </p>
              <p className="text-xs text-[var(--ink-muted)]">
                Optional — what should happen next.
              </p>
            </div>
            <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)]">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)] bg-[var(--bg)]">
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                      Advice
                    </th>
                    <th className="w-24 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                      Select
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ADVICE_OPTIONS.map((option) => {
                    const on = insp.advice.includes(option);
                    return (
                      <tr
                        key={option}
                        className="border-b border-[var(--line)] last:border-0"
                      >
                        <td className="px-3 py-2.5 text-[var(--ink)]">
                          {option}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              onChange({
                                advice: on
                                  ? insp.advice.filter((a) => a !== option)
                                  : [...insp.advice, option],
                              })
                            }
                            className={[
                              "min-h-9 min-w-16 rounded-md border px-2 text-xs font-semibold",
                              on
                                ? "border-[var(--accent)] text-[var(--accent)] ring-1 ring-[var(--accent)]"
                                : "border-[var(--line)] text-[var(--ink-muted)]",
                            ].join(" ")}
                          >
                            {on ? "Yes ✓" : "No"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-sm font-medium text-[var(--ink-muted)]">
              Photos (optional)
            </p>
            <label className="flex min-h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-center">
              <span className="text-sm font-semibold text-[var(--ink)]">
                {insp.photoCount === 0
                  ? "Add photos"
                  : `${insp.photoCount} attached`}
              </span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="sr-only"
                onChange={(e) => {
                  const n = e.target.files?.length ?? 0;
                  if (n > 0) onChange({ photoCount: insp.photoCount + n });
                  e.target.value = "";
                }}
              />
            </label>
          </section>

          <button
            type="button"
            onClick={onBack}
            className={[
              "flex min-h-11 w-full items-center justify-center rounded-lg text-sm font-semibold",
              complete
                ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                : "bg-[var(--ink)] text-[var(--bg)]",
            ].join(" ")}
          >
            {complete ? "Save area ✓" : "Save & return"}
          </button>
          {!complete && (
            <p className="text-center text-xs text-[var(--warn)]">
              {insp.status === "issues" &&
              insp.findings.length === 0 &&
              insp.pestTypes.length === 0
                ? "Add at least one finding or pest type."
                : "Finish treatment / device fields to mark this area complete."}
            </p>
          )}
        </>
      )}
    </main>
  );
}
