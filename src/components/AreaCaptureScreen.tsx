"use client";

import { useMemo, useState } from "react";
import { Chip, ChipGroup } from "@/components/Chip";
import {
  ACTION_TIER_OPTIONS,
  CONDUCIVE_OPTIONS,
  EVIDENCE_OPTIONS,
  PEST_TYPE_OPTIONS,
  THRESHOLD_OPTIONS,
  TREATMENT_APPLIED_OPTIONS,
  suggestRecommendation,
  type ActionTier,
  type ConduciveType,
  type EvidenceId,
  type PestTypeId,
  type ThresholdLevel,
  type TreatmentApplied,
} from "@/lib/ipm";
import {
  deriveAreaRollups,
  emptyTreatmentRow,
  isAreaComplete,
  isPointComplete,
  isRedDotArea,
  normalizeTreatment,
  type AreaInspection,
  type InspectionPoint,
} from "@/lib/types";
import {
  compressImageFiles,
  maxPhotosPerArea,
  mergeAreaPhotos,
} from "../lib/photos";
import {
  DEVICE_ACTIONS,
  DEVICE_COUNTS,
  TREATMENT_APPLICATION_METHODS,
  TREATMENT_PRODUCT_NAMES,
  TREATMENT_QUANTITIES,
  getTreatmentCatalogItem,
} from "@/lib/vocabulary";

const STEPS = [
  { id: "points", label: "Points" },
  { id: "treatment", label: "Treatment" },
  { id: "recommendation", label: "Advice" },
  { id: "photos", label: "Photos" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

export function AreaCaptureScreen({
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
  const [step, setStep] = useState<StepId>("points");
  const [openPointId, setOpenPointId] = useState<string | null>(
    insp.points[0]?.pointId ?? null,
  );
  const [recEdited, setRecEdited] = useState(false);
  const [stepHint, setStepHint] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoHint, setPhotoHint] = useState<string | null>(null);

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  const treatment = normalizeTreatment(insp.treatment);
  const rows =
    treatment.applications.length > 0
      ? treatment.applications
      : treatmentOn
        ? [emptyTreatmentRow()]
        : [];

  const needsChemical = insp.points.some(
    (p) => p.outcome === "issue" && p.actionTier === "targeted_treatment",
  );
  const pointsDone = insp.points.every(isPointComplete);
  const complete = isAreaComplete(insp);
  const donePoints = insp.points.filter(isPointComplete).length;

  const autoHint = useMemo(() => {
    const roll = deriveAreaRollups(insp.points);
    if (!roll.status) return "";
    return suggestRecommendation(roll.overallThreshold, roll.overallActionTier);
  }, [insp.points]);

  function setRows(next: typeof rows) {
    onChange({
      treatment: {
        ...treatment,
        applications: next.some((r) => r.product) ? next : [],
      },
      treatmentApplied:
        next.some((r) => r.product) && insp.treatmentApplied === "none"
          ? "corrective"
          : insp.treatmentApplied,
    });
  }

  function updatePoint(pointId: string, patch: Partial<InspectionPoint>) {
    const points = insp.points.map((p) =>
      p.pointId === pointId ? { ...p, ...patch } : p,
    );
    const roll = deriveAreaRollups(points);
    const auto = roll.status
      ? suggestRecommendation(roll.overallThreshold, roll.overallActionTier)
      : "";
    onChange({
      points,
      recommendation:
        recEdited && insp.recommendation ? insp.recommendation : auto,
    });
  }

  function markAllClean() {
    const points = insp.points.map((p) => ({
      ...p,
      outcome: "clean" as const,
      thresholdLevel: "none" as const,
      identification: { pestType: null, evidence: null },
      conduciveCondition: { present: false, type: null },
      actionTier: "monitor" as const,
    }));
    setRecEdited(false);
    onChange({
      points,
      recommendation: suggestRecommendation("none", "monitor"),
      treatmentApplied: "none",
      treatment: { applications: [], serviceActions: [] },
    });
    onTreatmentOnChange(false);
  }

  async function addPhotosFromFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setPhotoBusy(true);
    setPhotoHint(null);
    try {
      const { photos: incoming, errors } = await compressImageFiles(fileList);
      const { photos, truncated } = mergeAreaPhotos(insp.photos, incoming);
      onChange({ photos, photoCount: photos.length });
      const messages = [...errors];
      if (truncated > 0) {
        messages.push(`Limit is ${maxPhotosPerArea()} photos per area`);
      }
      setPhotoHint(messages[0] ?? null);
    } finally {
      setPhotoBusy(false);
    }
  }

  function treatmentStepOk(): boolean {
    if (needsChemical) {
      const apps = normalizeTreatment(insp.treatment).applications.filter(
        (a) => a.product && a.method && a.quantity,
      );
      if (apps.length === 0) return false;
    }
    const apps = normalizeTreatment(insp.treatment).applications.filter(
      (a) => a.product || a.method || a.quantity,
    );
    for (const app of apps) {
      if (!app.product || !app.method || !app.quantity) return false;
    }
    if (insp.deviceService.enabled) {
      if (!insp.deviceService.count.trim()) return false;
      if (insp.deviceService.actions.length === 0) return false;
    }
    return true;
  }

  function goNext() {
    setStepHint(null);
    if (step === "points" && !pointsDone) {
      setStepHint(
        "Complete every inspection point (Clean or Issue with detail) before continuing.",
      );
      return;
    }
    if (step === "treatment" && !treatmentStepOk()) {
      setStepHint(
        needsChemical
          ? "Add product / method / qty for targeted treatment."
          : "Finish treatment / device fields before continuing.",
      );
      return;
    }
    if (step === "recommendation" && !insp.recommendation.trim() && autoHint) {
      onChange({ recommendation: autoHint });
    }
    const next = STEPS[stepIndex + 1];
    if (next) {
      if (next.id === "recommendation" && !insp.recommendation.trim() && autoHint) {
        onChange({ recommendation: autoHint });
      }
      setStep(next.id);
    }
  }

  function goBack() {
    setStepHint(null);
    if (isFirst) {
      onBack();
      return;
    }
    const prev = STEPS[stepIndex - 1];
    if (prev) setStep(prev.id);
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col pb-8">
      <div className="space-y-1">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-[var(--accent-deep)]"
        >
          ← All areas
        </button>
        <h2 className="text-xl font-semibold text-[var(--ink)]">{insp.area}</h2>
        <p className="text-xs text-[var(--ink-muted)]">
          Step {stepIndex + 1} of {STEPS.length} · {STEPS[stepIndex].label}
          {step === "points"
            ? ` · ${donePoints}/${insp.points.length} points`
            : ""}
        </p>
        {isRedDotArea(insp.area) && (
          <p className="mt-2 rounded-lg border border-[var(--warn)]/40 bg-[var(--warn-soft)] px-3 py-2 text-xs leading-relaxed text-[var(--ink)]">
            Record outstanding Red Dot items and any new structural gaps here
            before continuing the site walk.
          </p>
        )}
      </div>

      <nav
        aria-label="Area capture steps"
        className="mt-4 grid grid-cols-4 gap-1.5"
      >
        {STEPS.map((s, i) => {
          const active = s.id === step;
          const done = i < stepIndex;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                // Allow jumping back freely; forward only if prior steps ok
                if (i <= stepIndex) {
                  setStepHint(null);
                  setStep(s.id);
                  return;
                }
                if (i === stepIndex + 1) goNext();
              }}
              className={[
                "rounded-lg px-1.5 py-2 text-center text-[11px] font-semibold leading-tight",
                active
                  ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                  : done
                    ? "border border-[var(--accent)] text-[var(--accent)]"
                    : "border border-[var(--line)] text-[var(--ink-muted)]",
              ].join(" ")}
            >
              {i + 1}. {s.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-5 min-h-0 flex-1 space-y-4">
        {step === "points" && (
          <section className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={markAllClean}
                className="min-h-10 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold text-[var(--ink)]"
              >
                Mark all points clean
              </button>
            </div>
            <div className="space-y-2">
              {insp.points.map((point) => (
                <PointCard
                  key={point.pointId}
                  point={point}
                  open={openPointId === point.pointId}
                  onToggle={() =>
                    setOpenPointId(
                      openPointId === point.pointId ? null : point.pointId,
                    )
                  }
                  onUpdate={(patch) => updatePoint(point.pointId, patch)}
                  onTargetedTreatment={() => onTreatmentOnChange(true)}
                />
              ))}
            </div>
          </section>
        )}

        {step === "treatment" && (
          <section className="space-y-3">
            <p className="text-sm text-[var(--ink-muted)]">
              Area-level treatment class and chemical detail. Required when any
              point used targeted treatment.
            </p>
            <Field label="Treatment class">
              <ChipGroup
                options={TREATMENT_APPLIED_OPTIONS.map((t) => t.label)}
                selected={[
                  TREATMENT_APPLIED_OPTIONS.find(
                    (t) => t.id === insp.treatmentApplied,
                  )?.label ?? "None",
                ]}
                onChange={(next) => {
                  const label = next[0] ?? "None";
                  const id = (TREATMENT_APPLIED_OPTIONS.find(
                    (t) => t.label === label,
                  )?.id ?? "none") as TreatmentApplied;
                  if (id === "none") {
                    onTreatmentOnChange(false);
                    onChange({
                      treatmentApplied: id,
                      treatment: { applications: [], serviceActions: [] },
                    });
                  } else {
                    onTreatmentOnChange(true);
                    onChange({ treatmentApplied: id });
                  }
                }}
                multi={false}
              />
            </Field>

            {(treatmentOn ||
              needsChemical ||
              insp.treatmentApplied !== "none") && (
              <div className="space-y-3">
                <p className="text-xs text-[var(--ink-muted)]">
                  Chemical detail (product / method / qty)
                </p>
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
                            setRows(
                              rows.map((row, i) =>
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
                              ),
                            );
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

            {showDevices && (
              <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
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
                    <Field label="Count">
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
                    </Field>
                    <Field label="Actions">
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
                    </Field>
                  </>
                )}
              </div>
            )}
          </section>
        )}

        {step === "recommendation" && (
          <section className="space-y-3">
            <div>
              <p className="text-sm font-medium text-[var(--ink)]">
                Recommendation
              </p>
              <p className="mt-1 text-xs text-[var(--ink-muted)]">
                Auto-suggested from threshold + action tier — editable.
              </p>
            </div>
            {autoHint && insp.recommendation !== autoHint && (
              <button
                type="button"
                className="text-xs font-semibold text-[var(--accent-deep)]"
                onClick={() => {
                  setRecEdited(false);
                  onChange({ recommendation: autoHint });
                }}
              >
                Reset to suggestion: {autoHint}
              </button>
            )}
            <textarea
              value={insp.recommendation}
              onChange={(e) => {
                setRecEdited(true);
                onChange({ recommendation: e.target.value });
              }}
              rows={4}
              placeholder={autoHint || "Recommendation…"}
              className="min-h-24 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
            />
          </section>
        )}

        {step === "photos" && (
          <section className="space-y-3">
            <div>
              <p className="text-sm font-medium text-[var(--ink)]">
                Photos (optional)
              </p>
              <p className="mt-1 text-xs text-[var(--ink-muted)]">
                Add multiple evidence photos. You can keep adding until you hit{" "}
                {maxPhotosPerArea()} per area.
              </p>
            </div>

            {insp.photos.length > 0 && (
              <ul className="grid grid-cols-3 gap-2">
                {insp.photos.map((photo) => (
                  <li
                    key={photo.id}
                    className="relative overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--bg)]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.dataUrl}
                      alt={photo.name}
                      className="aspect-square w-full object-cover"
                    />
                    <button
                      type="button"
                      aria-label={`Remove ${photo.name}`}
                      onClick={() => {
                        const photos = insp.photos.filter(
                          (p) => p.id !== photo.id,
                        );
                        onChange({ photos, photoCount: photos.length });
                      }}
                      className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--ink)]/80 text-xs font-bold text-[var(--bg)]"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="grid grid-cols-2 gap-2">
              <label
                className={[
                  "flex min-h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface)] px-2 py-4 text-center",
                  insp.photos.length >= maxPhotosPerArea()
                    ? "pointer-events-none opacity-40"
                    : "",
                ].join(" ")}
              >
                <span className="text-sm font-semibold text-[var(--ink)]">
                  Gallery
                </span>
                <span className="text-[11px] text-[var(--ink-muted)]">
                  Add multiple
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  disabled={
                    photoBusy || insp.photos.length >= maxPhotosPerArea()
                  }
                  onChange={(e) => {
                    void addPhotosFromFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
              <label
                className={[
                  "flex min-h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface)] px-2 py-4 text-center",
                  insp.photos.length >= maxPhotosPerArea()
                    ? "pointer-events-none opacity-40"
                    : "",
                ].join(" ")}
              >
                <span className="text-sm font-semibold text-[var(--ink)]">
                  Camera
                </span>
                <span className="text-[11px] text-[var(--ink-muted)]">
                  Take / add more
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  className="sr-only"
                  disabled={
                    photoBusy || insp.photos.length >= maxPhotosPerArea()
                  }
                  onChange={(e) => {
                    void addPhotosFromFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>

            <p className="text-center text-xs text-[var(--ink-muted)]">
              {photoBusy
                ? "Compressing photos…"
                : insp.photos.length === 0
                  ? "No photos yet"
                  : `${insp.photos.length} photo${insp.photos.length === 1 ? "" : "s"} attached`}
              {photoHint ? ` · ${photoHint}` : ""}
            </p>
          </section>
        )}
      </div>

      {stepHint && (
        <p className="mt-3 text-center text-xs text-[var(--warn)]">{stepHint}</p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={goBack}
          className="flex min-h-11 items-center justify-center rounded-lg border border-[var(--line)] text-sm font-semibold text-[var(--ink)]"
        >
          {isFirst ? "Cancel" : "Back"}
        </button>
        {isLast ? (
          <button
            type="button"
            onClick={onBack}
            className={[
              "flex min-h-11 items-center justify-center rounded-lg text-sm font-semibold",
              complete
                ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                : "bg-[var(--ink)] text-[var(--bg)]",
            ].join(" ")}
          >
            {complete ? "Save area ✓" : "Save & return"}
          </button>
        ) : (
          <button
            type="button"
            onClick={goNext}
            className="flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-semibold text-[var(--accent-ink)]"
          >
            Next
          </button>
        )}
      </div>
    </main>
  );
}

function PointCard({
  point,
  open,
  onToggle,
  onUpdate,
  onTargetedTreatment,
}: {
  point: InspectionPoint;
  open: boolean;
  onToggle: () => void;
  onUpdate: (patch: Partial<InspectionPoint>) => void;
  onTargetedTreatment: () => void;
}) {
  const done = isPointComplete(point);
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-3 py-3 text-left"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-[var(--ink)]">
            {point.label}
          </span>
          <span className="text-xs text-[var(--ink-muted)]">
            {point.outcome === "clean"
              ? "Clean"
              : point.outcome === "issue"
                ? `Issue · ${point.thresholdLevel}`
                : "Not started"}
            {done ? " · Done" : ""}
          </span>
        </span>
        <span className="text-xs text-[var(--ink-muted)]">
          {open ? "▾" : "▸"}
        </span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-[var(--line)] px-3 py-3">
          <div className="grid grid-cols-2 gap-2">
            <Chip
              label="Clean"
              selected={point.outcome === "clean"}
              onClick={() =>
                onUpdate({
                  outcome: "clean",
                  thresholdLevel: "none",
                  identification: { pestType: null, evidence: null },
                  conduciveCondition: { present: false, type: null },
                  actionTier: "monitor",
                })
              }
            />
            <Chip
              label="Issue"
              selected={point.outcome === "issue"}
              onClick={() =>
                onUpdate({
                  outcome: "issue",
                  thresholdLevel:
                    point.thresholdLevel === "none"
                      ? "light"
                      : point.thresholdLevel,
                })
              }
            />
          </div>

          {point.outcome === "issue" && (
            <>
              <Field label="Pest identification">
                <ChipGroup
                  options={PEST_TYPE_OPTIONS.map((p) => p.label)}
                  selected={
                    point.identification.pestType
                      ? [
                          PEST_TYPE_OPTIONS.find(
                            (p) => p.id === point.identification.pestType,
                          )?.label ?? "",
                        ].filter(Boolean)
                      : []
                  }
                  onChange={(next) => {
                    const label = next[0];
                    const id =
                      (PEST_TYPE_OPTIONS.find((p) => p.label === label)
                        ?.id as PestTypeId) ?? null;
                    onUpdate({
                      identification: {
                        ...point.identification,
                        pestType: id,
                      },
                    });
                  }}
                  multi={false}
                  searchable
                  placeholder="Pest…"
                />
              </Field>

              <Field label="Evidence">
                <ChipGroup
                  options={EVIDENCE_OPTIONS.map((e) => e.label)}
                  selected={
                    point.identification.evidence
                      ? [
                          EVIDENCE_OPTIONS.find(
                            (e) => e.id === point.identification.evidence,
                          )?.label ?? "",
                        ].filter(Boolean)
                      : []
                  }
                  onChange={(next) => {
                    const label = next[0];
                    const id =
                      (EVIDENCE_OPTIONS.find((e) => e.label === label)
                        ?.id as EvidenceId) ?? null;
                    onUpdate({
                      identification: {
                        ...point.identification,
                        evidence: id,
                      },
                    });
                  }}
                  multi={false}
                  searchable
                  placeholder="Evidence…"
                />
              </Field>

              <Field label="Activity level">
                <ChipGroup
                  options={THRESHOLD_OPTIONS.filter((t) => t.id !== "none").map(
                    (t) => t.label,
                  )}
                  selected={[
                    THRESHOLD_OPTIONS.find((t) => t.id === point.thresholdLevel)
                      ?.label ?? "Light",
                  ]}
                  onChange={(next) => {
                    const label = next[0] ?? "Light";
                    const id = (THRESHOLD_OPTIONS.find((t) => t.label === label)
                      ?.id ?? "light") as ThresholdLevel;
                    onUpdate({ thresholdLevel: id });
                  }}
                  multi={false}
                />
              </Field>

              <Field label="Conducive condition">
                <div className="grid grid-cols-2 gap-2">
                  <Chip
                    label="None noted"
                    selected={!point.conduciveCondition.present}
                    onClick={() =>
                      onUpdate({
                        conduciveCondition: { present: false, type: null },
                      })
                    }
                  />
                  <Chip
                    label="Present"
                    selected={point.conduciveCondition.present}
                    onClick={() =>
                      onUpdate({
                        conduciveCondition: {
                          present: true,
                          type:
                            point.conduciveCondition.type ?? "food_debris",
                        },
                      })
                    }
                  />
                </div>
                {point.conduciveCondition.present && (
                  <ChipGroup
                    options={CONDUCIVE_OPTIONS.map((c) => c.label)}
                    selected={
                      point.conduciveCondition.type
                        ? [
                            CONDUCIVE_OPTIONS.find(
                              (c) => c.id === point.conduciveCondition.type,
                            )?.label ?? "",
                          ].filter(Boolean)
                        : []
                    }
                    onChange={(next) => {
                      const label = next[0];
                      const id =
                        (CONDUCIVE_OPTIONS.find((c) => c.label === label)
                          ?.id as ConduciveType) ?? null;
                      onUpdate({
                        conduciveCondition: { present: true, type: id },
                      });
                    }}
                    multi={false}
                    searchable
                    placeholder="Condition…"
                  />
                )}
              </Field>

              <Field label="Action tier (IPM)">
                <ChipGroup
                  options={ACTION_TIER_OPTIONS.map((a) => a.label)}
                  selected={[
                    ACTION_TIER_OPTIONS.find((a) => a.id === point.actionTier)
                      ?.label ?? "Monitor only",
                  ]}
                  onChange={(next) => {
                    const label = next[0];
                    const id = (ACTION_TIER_OPTIONS.find((a) => a.label === label)
                      ?.id ?? "monitor") as ActionTier;
                    onUpdate({ actionTier: id });
                    if (id === "targeted_treatment") onTargetedTreatment();
                  }}
                  multi={false}
                />
              </Field>

              <Field label="Note">
                <textarea
                  value={point.note}
                  onChange={(e) => onUpdate({ note: e.target.value })}
                  rows={2}
                  placeholder="Optional detail…"
                  className="min-h-16 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                />
              </Field>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
        {label}
      </p>
      {children}
    </div>
  );
}
