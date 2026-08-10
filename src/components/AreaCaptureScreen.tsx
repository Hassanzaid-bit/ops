"use client";

import { useEffect, useMemo, useState } from "react";
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
  compressImageFiles,
  maxPhotosPerArea,
  maxPhotosPerDeviceUnit,
  maxPhotosPerRedDotAction,
  mergeAreaPhotos,
} from "../lib/photos";
import {
  areaMissingFields,
  baitRollupAdviceSuggestion,
  baitStationAdviceSuggestion,
  createCustomInspectionPoint,
  deriveAreaRollups,
  deviceUnitPhotoRollup,
  emptyDeviceUnit,
  emptyRedDotAction,
  emptyRedDotUpdate,
  emptySubArea,
  emptyTreatmentRow,
  fcuAdviceSuggestion,
  isAreaComplete,
  isBaitRollupComplete,
  isFcuArea,
  isFcuComplete,
  isMonitoringDeviceArea,
  isPointComplete,
  isRedDotArea,
  isRedDotComplete,
  isRodentBaitArea,
  isSubAreaComplete,
  normalizeDeviceService,
  normalizeTreatment,
  redDotPhotoRollup,
  subAreaAdviceSuggestion,
  subAreaNeedsChemical,
  type AreaInspection,
  type DeviceService,
  type DeviceUnit,
  type DeviceUnitActivity,
  type FcuCatchLevel,
  type InspectionPoint,
  type RedDotAction,
  type RedDotUpdate,
  type SubAreaInspection,
} from "@/lib/types";
import {
  ADVICE_OPTIONS,
  DEVICE_ACTIONS,
  DEVICE_COUNTS,
  DEVICE_UNIT_ACTIVITY_OPTIONS,
  DEVICE_UNIT_STATUS_OPTIONS,
  FCU_ACTIONS,
  FCU_CATCH_LEVEL_OPTIONS,
  SUBAREA_ACTIONS,
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

const RED_DOT_STEPS = [{ id: "points", label: "Status" }] as const;
const BAIT_STEPS = [{ id: "points", label: "Stations" }] as const;
const FCU_STEPS = [{ id: "points", label: "Units" }] as const;
const STANDARD_STEPS = [{ id: "points", label: "Area" }] as const;

type StepId = (typeof STEPS)[number]["id"];

function redDotAdviceSuggestion(rd: {
  previousFound: boolean | null;
  dotsPlaced: boolean | null;
}): string {
  if (rd.dotsPlaced === true) {
    return "Client action needed — address structural or sanitation issues marked with Red Dots";
  }
  if (rd.previousFound === false && rd.dotsPlaced === false) {
    return "Continue routine monitoring — premises compliant with pest-proofing and hygiene standards";
  }
  return "Continue routine monitoring";
}

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
  const [stepHints, setStepHints] = useState<string[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoHint, setPhotoHint] = useState<string | null>(null);
  const [newPointLabel, setNewPointLabel] = useState("");
  const [pointHint, setPointHint] = useState<string | null>(null);

  const isRedDot = isRedDotArea(insp.area);
  const isBait = isRodentBaitArea(insp.area);
  const isFcu = isFcuArea(insp.area);
  const isStandard = !isRedDot && !isBait && !isFcu;
  const flowSteps = isRedDot
    ? RED_DOT_STEPS
    : isBait
      ? BAIT_STEPS
      : isFcu
        ? FCU_STEPS
        : STANDARD_STEPS;
  const stepIndex = flowSteps.findIndex((s) => s.id === step);
  const safeStepIndex = stepIndex >= 0 ? stepIndex : 0;
  const isFirst = safeStepIndex === 0;
  const isLast = safeStepIndex === flowSteps.length - 1;

  const treatment = normalizeTreatment(insp.treatment);
  const rows =
    treatment.applications.length > 0
      ? treatment.applications
      : treatmentOn
        ? [emptyTreatmentRow()]
        : [];

  const needsChemical =
    insp.outcome === "issue" && insp.treatmentApplied === "corrective";
  const pointsDone = true;
  const redDotDone = !isRedDot || isRedDotComplete(insp.redDot);
  const baitDone = !isBait || isBaitRollupComplete(insp.deviceService);
  const fcuDone = !isFcu || isFcuComplete(insp.deviceService);
  const complete = isAreaComplete(insp);
  const useUnitLog =
    isMonitoringDeviceArea(insp.area) && !isBait && !isFcu;

  const autoHint = useMemo(() => {
    if (isRedDot && insp.redDot) {
      return redDotAdviceSuggestion(insp.redDot);
    }
    if (isFcu) {
      return fcuAdviceSuggestion(insp.deviceService);
    }
    return "";
  }, [insp, isRedDot, isFcu]);

  // Keep single-step flows on their only step
  useEffect(() => {
    if (!isRedDot && !isBait && !isFcu && !isStandard) return;
    if (step === "treatment" || step === "recommendation" || step === "photos") {
      setStep("points");
    }
  }, [isRedDot, isBait, isFcu, isStandard, step]);

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

  function addPoint(rawLabel: string) {
    const label = rawLabel.trim().replace(/\s+/g, " ");
    if (!label) {
      setPointHint("Enter what you examined (e.g. Couches, waste bins).");
      return;
    }
    if (
      insp.points.some((p) => p.label.toLowerCase() === label.toLowerCase())
    ) {
      setPointHint("That section is already on this area.");
      return;
    }
    const point = createCustomInspectionPoint(label);
    onChange({ points: [...insp.points, point] });
    setNewPointLabel("");
    setPointHint(null);
    setOpenPointId(point.pointId);
  }

  function removePoint(pointId: string) {
    if (insp.points.length <= 1) {
      setPointHint("Keep at least one section on this area.");
      return;
    }
    const points = insp.points.filter((p) => p.pointId !== pointId);
    const roll = deriveAreaRollups(points);
    const auto = roll.status
      ? suggestRecommendation(roll.overallThreshold, roll.overallActionTier)
      : "";
    onChange({
      points,
      recommendation:
        recEdited && insp.recommendation ? insp.recommendation : auto,
    });
    if (openPointId === pointId) {
      setOpenPointId(points[0]?.pointId ?? null);
    }
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
      const units = insp.deviceService.units ?? [];
      if (units.length > 0) {
        if (
          !units.every((u) => u.label.trim() && u.services.length > 0)
        ) {
          return false;
        }
      } else {
        if (!insp.deviceService.count.trim()) return false;
        if (insp.deviceService.actions.length === 0) return false;
      }
    }
    return true;
  }

  function goNext() {
    setStepHints([]);
    if (!pointsDone || !redDotDone || !baitDone || !fcuDone) {
      const missing = areaMissingFields(insp);
      setStepHints(
        missing.length > 0
          ? missing
          : ["Complete required fields before continuing."],
      );
      return;
    }
    if (!insp.recommendation.trim() && autoHint) {
      onChange({ recommendation: autoHint });
    }
    const next = flowSteps[safeStepIndex + 1];
    if (next) setStep(next.id as StepId);
  }

  function goBack() {
    setStepHints([]);
    if (isFirst) {
      onBack();
      return;
    }
    const prev = flowSteps[safeStepIndex - 1];
    if (prev) setStep(prev.id);
  }

  function saveArea() {
    if (complete) {
      setStepHints([]);
      onBack();
      return;
    }
    const missing = areaMissingFields(insp);
    setStepHints(
      missing.length > 0
        ? missing
        : ["Complete required fields before saving. Use Draft to leave and finish later."],
    );
  }

  function updateRedDot(redDot: RedDotUpdate) {
    const actionList = redDot.actions ?? [];
    const next = {
      ...redDot,
      newGapsFound: redDot.dotsPlaced,
      actions: redDot.dotsPlaced === true ? actionList : [],
      dotsPlacedCount:
        redDot.dotsPlaced === true ? String(actionList.length) : "",
      dotsPlacedLocations:
        redDot.dotsPlaced === true
          ? actionList
              .map((a) => a.location.trim())
              .filter(Boolean)
              .join("; ")
          : "",
      newGapsNote:
        redDot.dotsPlaced === true
          ? actionList
              .map((a) => a.issue.trim())
              .filter(Boolean)
              .join("; ")
          : "",
    };
    const photos = redDotPhotoRollup(next);
    const auto = redDotAdviceSuggestion(next);
    onChange({
      redDot: next,
      photos,
      photoCount: photos.length,
      recommendation:
        recEdited && insp.recommendation ? insp.recommendation : auto,
    });
  }

  function updateBaitDevice(patch: Partial<DeviceService>) {
    const next = normalizeDeviceService({
      ...insp.deviceService,
      enabled: true,
      ...patch,
    });
    const photos = deviceUnitPhotoRollup(next);
    onChange({
      deviceService: next,
      photos,
      photoCount: photos.length,
      recommendation: baitRollupAdviceSuggestion(next),
    });
  }

  function updateFcuDevice(patch: Partial<DeviceService>) {
    const next = normalizeDeviceService({
      ...insp.deviceService,
      enabled: true,
      ...patch,
    });
    const photos = deviceUnitPhotoRollup(next);
    const exceptionTips = (next.units ?? [])
      .map((u) => u.recommendation.trim())
      .filter(Boolean);
    onChange({
      deviceService: next,
      photos,
      photoCount: photos.length,
      recommendation:
        exceptionTips.length > 0
          ? exceptionTips.join("; ")
          : fcuAdviceSuggestion(next),
    });
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col pb-8">
      <div className="space-y-1">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-[var(--accent-deep)]"
        >
          ← Draft
        </button>
        <h2 className="text-xl font-semibold text-[var(--ink)]">{insp.area}</h2>
        <p className="text-xs text-[var(--ink-muted)]">
          {isRedDot
            ? "Single-step Red Dot update"
            : isBait
              ? "Station roll-up · add exception stations only when needed"
              : isFcu
                ? "FCU roll-up · add exception units only when needed"
                : "Subareas · found / action / recommendation"}
        </p>
      </div>

      {flowSteps.length > 1 && (
      <nav
        aria-label="Area capture steps"
        className="mt-4 grid grid-cols-4 gap-1.5"
      >
        {flowSteps.map((s, i) => {
          const active = s.id === step;
          const done = i < safeStepIndex;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                // Allow jumping back freely; forward only if prior steps ok
                if (i <= safeStepIndex) {
                  setStepHints([]);
                  setStep(s.id);
                  return;
                }
                if (i === safeStepIndex + 1) goNext();
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
      )}

      <div className="mt-5 min-h-0 flex-1 space-y-4">
        {step === "points" && (
          <section className="space-y-3">
            {isRedDot ? (
              <>
                <RedDotForm
                  value={insp.redDot ?? emptyRedDotUpdate()}
                  onChange={updateRedDot}
                />
                <AdviceBlock
                  value={insp.recommendation}
                  autoHint={autoHint}
                  hint="Suggested from Red Dot status — editable."
                  onReset={() => {
                    setRecEdited(false);
                    onChange({ recommendation: autoHint });
                  }}
                  onChange={(recommendation) => {
                    setRecEdited(true);
                    onChange({ recommendation });
                  }}
                />
              </>
            ) : isBait ? (
              <BaitRollupEditor
                device={insp.deviceService}
                onDeviceChange={updateBaitDevice}
              />
            ) : isFcu ? (
              <FcuRollupEditor
                device={insp.deviceService}
                onDeviceChange={updateFcuDevice}
              />
            ) : (
              <NormalAreaEditor insp={insp} onChange={onChange} />
            )}
          </section>
        )}

        {step === "treatment" && !isStandard && (
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
                    {useUnitLog ? "Device units" : "Device service"}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const turningOn = !insp.deviceService.enabled;
                      onChange({
                        deviceService: normalizeDeviceService({
                          ...insp.deviceService,
                          enabled: turningOn,
                          count: turningOn
                            ? useUnitLog
                              ? String(
                                  Math.max(
                                    1,
                                    insp.deviceService.units?.length ?? 0,
                                  ),
                                )
                              : insp.deviceService.count
                            : "",
                          actions: turningOn ? insp.deviceService.actions : [],
                          units: turningOn
                            ? useUnitLog
                              ? insp.deviceService.units?.length
                                ? insp.deviceService.units
                                : [emptyDeviceUnit(1)]
                              : []
                            : [],
                        }),
                      });
                    }}
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
                {insp.deviceService.enabled && useUnitLog && (
                  <DeviceUnitsEditor
                    units={insp.deviceService.units ?? []}
                    onChange={(units) =>
                      onChange({
                        deviceService: normalizeDeviceService({
                          ...insp.deviceService,
                          enabled: true,
                          units,
                        }),
                      })
                    }
                  />
                )}
                {insp.deviceService.enabled && !useUnitLog && (
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

        {step === "recommendation" && !isStandard && (
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

        {step === "photos" && !isStandard && (
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

      {stepHints.length > 0 && (
        <div
          className="mt-3 rounded-lg border border-[var(--warn)]/40 bg-[var(--warn-soft)] px-3 py-2 text-left"
          role="alert"
        >
          <p className="text-xs font-semibold text-[var(--warn)]">
            Still needed before save
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-[var(--warn)]">
            {stepHints.map((hint) => (
              <li key={hint}>{hint}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={goBack}
          className="flex min-h-11 items-center justify-center rounded-lg border border-[var(--line)] text-sm font-semibold text-[var(--ink)]"
        >
          {isFirst ? "Draft" : "Back"}
        </button>
        {isLast ? (
          <button
            type="button"
            onClick={saveArea}
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
  canRemove,
  onToggle,
  onUpdate,
  onRemove,
  onTargetedTreatment,
}: {
  point: InspectionPoint;
  open: boolean;
  canRemove: boolean;
  onToggle: () => void;
  onUpdate: (patch: Partial<InspectionPoint>) => void;
  onRemove: () => void;
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
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="text-xs font-semibold text-[var(--ink-muted)]"
            >
              Remove section
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function YesNo({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Chip label="Yes" selected={value === true} onClick={() => onChange(true)} />
      <Chip
        label="No"
        selected={value === false}
        onClick={() => onChange(false)}
      />
    </div>
  );
}

function RedDotForm({
  value,
  onChange,
}: {
  value: RedDotUpdate;
  onChange: (next: RedDotUpdate) => void;
}) {
  const actions = value.actions ?? [];
  const [photoBusyId, setPhotoBusyId] = useState<string | null>(null);
  const [photoHint, setPhotoHint] = useState<string | null>(null);
  const maxPerAction = maxPhotosPerRedDotAction();

  function patch(p: Partial<RedDotUpdate>) {
    onChange({ ...value, actions, ...p });
  }

  function setActions(nextActions: RedDotAction[]) {
    patch({ actions: nextActions });
  }

  function updateAction(id: string, patchAction: Partial<RedDotAction>) {
    setActions(
      actions.map((a) => (a.id === id ? { ...a, ...patchAction } : a)),
    );
  }

  function addAction() {
    setActions([...actions, emptyRedDotAction()]);
  }

  function removeAction(id: string) {
    setActions(actions.filter((a) => a.id !== id));
  }

  async function addPhotosToAction(actionId: string, files: FileList | null) {
    if (!files?.length) return;
    const action = actions.find((a) => a.id === actionId);
    if (!action) return;
    setPhotoBusyId(actionId);
    setPhotoHint(null);
    try {
      const { photos: incoming, errors } = await compressImageFiles(files);
      const { photos, truncated } = mergeAreaPhotos(
        action.photos ?? [],
        incoming,
        maxPerAction,
      );
      setActions(
        actions.map((a) => (a.id === actionId ? { ...a, photos } : a)),
      );
      const messages = [...errors];
      if (truncated > 0) {
        messages.push(`Limit is ${maxPerAction} photos per Red Dot action`);
      }
      setPhotoHint(messages[0] ?? null);
    } finally {
      setPhotoBusyId(null);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
      <div>
        <p className="text-sm font-semibold text-[var(--ink)]">Red Dot update</p>
        <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
          Record pending actions from previous services and any new Red Dot
          actions opened for structural or sanitation issues.
        </p>
      </div>

      <Field label="Pending Red Dot actions from previous services?">
        <YesNo
          value={value.previousFound}
          onChange={(previousFound) => patch({ previousFound })}
        />
      </Field>
      {value.previousFound === true && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
            Count
            <input
              value={value.previousCount}
              onChange={(e) => patch({ previousCount: e.target.value })}
              placeholder="e.g. 2"
              className="mt-1 block min-h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 text-sm font-normal normal-case tracking-normal text-[var(--ink)]"
            />
          </label>
          <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
            Locations
            <input
              value={value.previousLocations}
              onChange={(e) => patch({ previousLocations: e.target.value })}
              placeholder="e.g. BOH rear door"
              className="mt-1 block min-h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 text-sm font-normal normal-case tracking-normal text-[var(--ink)]"
            />
          </label>
        </div>
      )}

      <Field label="New Red Dot actions opened this inspection?">
        <YesNo
          value={value.dotsPlaced}
          onChange={(dotsPlaced) => {
            if (dotsPlaced) {
              patch({
                dotsPlaced: true,
                newGapsFound: true,
                actions:
                  actions.length > 0 ? actions : [emptyRedDotAction()],
              });
            } else {
              patch({
                dotsPlaced: false,
                newGapsFound: false,
                actions: [],
              });
            }
          }}
        />
      </Field>

      {value.dotsPlaced === true && (
        <div className="space-y-3">
          {actions.map((action, index) => (
            <RedDotActionCard
              key={action.id}
              index={index}
              action={action}
              canRemove={actions.length > 1}
              photoBusy={photoBusyId === action.id}
              maxPhotos={maxPerAction}
              onUpdate={(patchAction) => updateAction(action.id, patchAction)}
              onRemove={() => removeAction(action.id)}
              onAddPhotos={(files) => void addPhotosToAction(action.id, files)}
            />
          ))}
          <button
            type="button"
            onClick={addAction}
            className="min-h-11 w-full rounded-lg border border-dashed border-[var(--line)] bg-[var(--bg)] text-sm font-semibold text-[var(--ink)]"
          >
            + Add another Red Dot
          </button>
          {photoHint && (
            <p className="text-xs font-medium text-red-800" role="alert">
              {photoHint}
            </p>
          )}
        </div>
      )}

      <label className="block space-y-1 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
        Extra note
        <textarea
          value={value.note}
          onChange={(e) => patch({ note: e.target.value })}
          rows={2}
          placeholder="Optional…"
          className="mt-1 block min-h-16 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm font-normal normal-case tracking-normal text-[var(--ink)]"
        />
      </label>
    </div>
  );
}

function RedDotActionCard({
  index,
  action,
  canRemove,
  photoBusy,
  maxPhotos,
  onUpdate,
  onRemove,
  onAddPhotos,
}: {
  index: number;
  action: RedDotAction;
  canRemove: boolean;
  photoBusy: boolean;
  maxPhotos: number;
  onUpdate: (patch: Partial<RedDotAction>) => void;
  onRemove: () => void;
  onAddPhotos: (files: FileList | null) => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const atLimit = action.photos.length >= maxPhotos;
  const label = action.location.trim() || `Red Dot ${index + 1}`;

  return (
    <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--bg)] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--ink)]">
          Red Dot {index + 1}
        </p>
        {canRemove && (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="text-xs font-semibold text-red-800"
          >
            Remove
          </button>
        )}
      </div>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="presentation"
        >
          <button
            type="button"
            aria-label="Cancel remove"
            className="absolute inset-0 bg-[var(--ink)]/45"
            onClick={() => setConfirmOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`rd-remove-${action.id}`}
            className="relative z-10 w-full max-w-sm rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]"
          >
            <h3
              id={`rd-remove-${action.id}`}
              className="text-base font-semibold text-[var(--ink)]"
            >
              Remove this Red Dot?
            </h3>
            <p className="mt-2 text-sm text-[var(--ink-muted)]">
              This will delete <span className="font-medium text-[var(--ink)]">{label}</span>
              {action.photos.length > 0
                ? ` and its ${action.photos.length} photo${action.photos.length === 1 ? "" : "s"}`
                : ""}
              . This can’t be undone.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="min-h-11 rounded-lg border border-[var(--line)] text-sm font-semibold text-[var(--ink)]"
              >
                Keep
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmOpen(false);
                  onRemove();
                }}
                className="min-h-11 rounded-lg bg-[var(--risk)] text-sm font-semibold text-[var(--accent-ink)]"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      <label className="block space-y-1 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
        Location
        <input
          value={action.location}
          onChange={(e) => onUpdate({ location: e.target.value })}
          placeholder="e.g. Pipe chase FOH"
          className="mt-1 block min-h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-normal normal-case tracking-normal text-[var(--ink)]"
        />
      </label>

      <label className="block space-y-1 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
        Issue / what’s marked
        <textarea
          value={action.issue}
          onChange={(e) => onUpdate({ issue: e.target.value })}
          rows={2}
          placeholder="Describe the structural or sanitation issue…"
          className="mt-1 block min-h-16 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-normal normal-case tracking-normal text-[var(--ink)]"
        />
      </label>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
          Photos ({action.photos.length}/{maxPhotos})
        </p>
        {action.photos.length > 0 && (
          <ul className="grid grid-cols-3 gap-2">
            {action.photos.map((photo) => (
              <li
                key={photo.id}
                className="relative overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)]"
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
                  onClick={() =>
                    onUpdate({
                      photos: action.photos.filter((p) => p.id !== photo.id),
                    })
                  }
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
              "flex min-h-14 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[var(--line)] bg-[var(--surface)] text-center",
              atLimit ? "pointer-events-none opacity-40" : "",
            ].join(" ")}
          >
            <span className="text-xs font-semibold text-[var(--ink)]">
              Gallery
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              disabled={photoBusy || atLimit}
              onChange={(e) => {
                onAddPhotos(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
          <label
            className={[
              "flex min-h-14 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[var(--line)] bg-[var(--surface)] text-center",
              atLimit ? "pointer-events-none opacity-40" : "",
            ].join(" ")}
          >
            <span className="text-xs font-semibold text-[var(--ink)]">
              Camera
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              disabled={photoBusy || atLimit}
              onChange={(e) => {
                onAddPhotos(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        {photoBusy && (
          <p className="text-center text-[11px] text-[var(--ink-muted)]">
            Compressing photos…
          </p>
        )}
      </div>
    </div>
  );
}

function AdviceBlock({
  value,
  autoHint,
  hint,
  onReset,
  onChange,
}: {
  value: string;
  autoHint: string;
  hint: string;
  onReset: () => void;
  onChange: (next: string) => void;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
      <div>
        <p className="text-sm font-semibold text-[var(--ink)]">
          Advice / recommendation
        </p>
        <p className="mt-0.5 text-xs text-[var(--ink-muted)]">{hint}</p>
      </div>
      {autoHint && value !== autoHint && (
        <button
          type="button"
          className="text-xs font-semibold text-[var(--accent-deep)]"
          onClick={onReset}
        >
          Reset to suggestion: {autoHint}
        </button>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder={autoHint || "Recommendation…"}
        className="min-h-20 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
      />
    </div>
  );
}

function NormalAreaEditor({
  insp,
  onChange,
}: {
  insp: AreaInspection;
  onChange: (patch: Partial<AreaInspection>) => void;
}) {
  const [newLabel, setNewLabel] = useState("");
  const [addHint, setAddHint] = useState<string | null>(null);
  const subs = insp.subAreas ?? [];
  const [openId, setOpenId] = useState<string | null>(
    () => subs[subs.length - 1]?.id ?? null,
  );

  function setSubs(next: SubAreaInspection[]) {
    onChange({ subAreas: next });
  }

  function updateSub(id: string, patch: Partial<SubAreaInspection>) {
    setSubs(subs.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function addSub(label: string) {
    const trimmed = label.trim().replace(/\s+/g, " ");
    if (!trimmed) {
      setAddHint("Enter a subarea name");
      return;
    }
    if (subs.some((s) => s.label.toLowerCase() === trimmed.toLowerCase())) {
      setAddHint("That subarea is already added");
      return;
    }
    setAddHint(null);
    setNewLabel("");
    const next = emptySubArea(trimmed);
    setSubs([...subs, next]);
    setOpenId(next.id);
  }

  function removeSub(id: string) {
    const next = subs.filter((s) => s.id !== id);
    setSubs(next);
    if (openId === id) {
      setOpenId(next[next.length - 1]?.id ?? null);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--ink-muted)]">
        Add each subarea you checked (e.g. Serving Counter). Tap a card to open
        or close it. For each: what was found, action taken, and recommendation.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          addSub(newLabel);
        }}
        className="space-y-2 rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-3"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
          Add subarea
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            value={newLabel}
            onChange={(e) => {
              setNewLabel(e.target.value);
              if (addHint) setAddHint(null);
            }}
            placeholder="e.g. Serving Counter, Couches…"
            className="min-h-11 min-w-[12rem] flex-1 rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
          />
          <button
            type="submit"
            className="min-h-11 rounded-lg bg-[var(--ink)] px-4 text-sm font-semibold text-[var(--bg)]"
          >
            + Add
          </button>
        </div>
        {addHint && (
          <p className="text-xs font-medium text-[var(--risk)]" role="alert">
            {addHint}
          </p>
        )}
      </form>

      {subs.map((sub, index) => (
        <SubAreaCard
          key={sub.id}
          index={index}
          sub={sub}
          open={openId === sub.id}
          onToggle={() =>
            setOpenId((current) => (current === sub.id ? null : sub.id))
          }
          onUpdate={(patch) => updateSub(sub.id, patch)}
          onRemove={() => removeSub(sub.id)}
        />
      ))}
    </div>
  );
}

function SubAreaCard({
  index,
  sub,
  open,
  onToggle,
  onUpdate,
  onRemove,
}: {
  index: number;
  sub: SubAreaInspection;
  open: boolean;
  onToggle: () => void;
  onUpdate: (patch: Partial<SubAreaInspection>) => void;
  onRemove: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoHint, setPhotoHint] = useState<string | null>(null);
  const maxPhotos = maxPhotosPerArea();
  const atLimit = (sub.photos?.length ?? 0) >= maxPhotos;
  const recAtLimit = (sub.recommendationPhotos?.length ?? 0) >= maxPhotos;
  const adviceHint = subAreaAdviceSuggestion(sub);
  const done = isSubAreaComplete(sub);
  const title = sub.label.trim() || `Subarea ${index + 1}`;
  const summary = [
    sub.outcome === "clean"
      ? "Clean"
      : sub.outcome === "issue"
        ? "Issue"
        : "Not set",
    sub.actions[0] || (sub.actionOther.trim() ? "Action noted" : null),
  ]
    .filter(Boolean)
    .join(" · ");

  async function addPhotos(
    files: FileList | null,
    field: "photos" | "recommendationPhotos" = "photos",
  ) {
    if (!files?.length) return;
    setPhotoBusy(true);
    setPhotoHint(null);
    try {
      const { photos: incoming, errors } = await compressImageFiles(files);
      const { photos, truncated } = mergeAreaPhotos(
        sub[field] ?? [],
        incoming,
        maxPhotos,
      );
      onUpdate({ [field]: photos });
      const messages = [...errors];
      if (truncated > 0) {
        messages.push(`Limit is ${maxPhotos} photos`);
      }
      setPhotoHint(messages[0] ?? null);
    } finally {
      setPhotoBusy(false);
    }
  }

  function setOutcome(outcome: "clean" | "issue") {
    const patch: Partial<SubAreaInspection> = { outcome };
    if (outcome === "clean") {
      patch.pestType = null;
      patch.evidence = null;
      patch.thresholdLevel = "none";
      patch.conduciveType = null;
      if (sub.actions.length === 0) patch.actions = ["No action required"];
    }
    if (!sub.recommendation.trim()) {
      patch.recommendation = subAreaAdviceSuggestion({ ...sub, outcome });
    }
    onUpdate(patch);
  }

  return (
    <div
      className={[
        "overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)]",
        done ? "border-[var(--ok)]/40" : "",
      ].join(" ")}
    >
      <div className="flex items-stretch gap-1">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-h-12 min-w-0 flex-1 items-center justify-between gap-2 px-3 py-2.5 text-left"
          aria-expanded={open}
        >
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[var(--ink)]">
                {index + 1}. {title}
              </span>
              {done ? (
                <span className="text-[11px] font-semibold text-[var(--ok)]">
                  Done
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-[var(--accent)]">
                  Incomplete
                </span>
              )}
            </span>
            {!open && (
              <span className="mt-0.5 block truncate text-xs text-[var(--ink-muted)]">
                {summary}
              </span>
            )}
          </span>
          <span className="shrink-0 text-sm text-[var(--ink-muted)]">
            {open ? "▲" : "▼"}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="shrink-0 px-3 text-xs font-semibold text-[var(--risk)]"
        >
          Remove
        </button>
      </div>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="presentation"
        >
          <button
            type="button"
            aria-label="Cancel remove"
            className="absolute inset-0 bg-[var(--ink)]/45"
            onClick={() => setConfirmOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-sm rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]"
          >
            <h3 className="text-base font-semibold text-[var(--ink)]">
              Remove this subarea?
            </h3>
            <p className="mt-2 text-sm text-[var(--ink-muted)]">
              This will delete{" "}
              <span className="font-medium text-[var(--ink)]">{title}</span>.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="min-h-11 rounded-lg border border-[var(--line)] text-sm font-semibold text-[var(--ink)]"
              >
                Keep
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmOpen(false);
                  onRemove();
                }}
                className="min-h-11 rounded-lg bg-[var(--risk)] text-sm font-semibold text-[var(--accent-ink)]"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {open && (
      <div className="space-y-3 border-t border-[var(--line)] p-3">
      <label className="block space-y-1 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
        Subarea name
        <input
          value={sub.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="e.g. Serving Counter"
          className="mt-1 block min-h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 text-sm font-normal normal-case tracking-normal text-[var(--ink)]"
        />
      </label>

      <StepSection step={1} title="What was found">
        <div className="grid grid-cols-2 gap-2">
          {(["clean", "issue"] as const).map((id) => {
            const selected = sub.outcome === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setOutcome(id)}
                className={[
                  "min-h-11 rounded-lg border text-sm font-semibold",
                  selected
                    ? id === "clean"
                      ? "border-[var(--ok)] bg-[var(--ok-soft)] text-[var(--ok)]"
                      : "border-[var(--risk)] bg-[var(--risk)]/10 text-[var(--risk)]"
                    : "border-[var(--line)] bg-[var(--bg)] text-[var(--ink)]",
                ].join(" ")}
              >
                {id === "clean" ? "Clean / none" : "Issue found"}
              </button>
            );
          })}
        </div>

      {sub.outcome === "issue" && (
        <div className="space-y-3 rounded-lg border border-[var(--line)] bg-[var(--bg)] p-3">
          <Field label="Pest">
            <ChipGroup
              options={PEST_TYPE_OPTIONS.map((o) => o.label)}
              selected={
                sub.pestType
                  ? [
                      PEST_TYPE_OPTIONS.find((o) => o.id === sub.pestType)
                        ?.label ?? "",
                    ].filter(Boolean)
                  : []
              }
              onChange={(next) => {
                const id =
                  PEST_TYPE_OPTIONS.find((o) => o.label === next[0])?.id ??
                  null;
                onUpdate({ pestType: id });
              }}
              multi={false}
              searchable
              placeholder="Select pest…"
            />
          </Field>
          <Field label="Evidence">
            <ChipGroup
              options={EVIDENCE_OPTIONS.map((o) => o.label)}
              selected={
                sub.evidence
                  ? [
                      EVIDENCE_OPTIONS.find((o) => o.id === sub.evidence)
                        ?.label ?? "",
                    ].filter(Boolean)
                  : []
              }
              onChange={(next) => {
                const id =
                  EVIDENCE_OPTIONS.find((o) => o.label === next[0])?.id ??
                  null;
                onUpdate({ evidence: id });
              }}
              multi={false}
              searchable
              placeholder="Select evidence…"
            />
          </Field>
          <Field label="Conducive">
            <ChipGroup
              options={CONDUCIVE_OPTIONS.map((o) => o.label)}
              selected={
                sub.conduciveType
                  ? [
                      CONDUCIVE_OPTIONS.find((o) => o.id === sub.conduciveType)
                        ?.label ?? "",
                    ].filter(Boolean)
                  : []
              }
              onChange={(next) => {
                const id =
                  CONDUCIVE_OPTIONS.find((o) => o.label === next[0])?.id ??
                  null;
                onUpdate({ conduciveType: id });
              }}
              multi={false}
              searchable
              placeholder="Select condition…"
            />
          </Field>
          <label className="block space-y-1 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
            Note
            <input
              value={sub.foundNote}
              onChange={(e) => onUpdate({ foundNote: e.target.value })}
              placeholder="Where / what you saw…"
              className="mt-1 block min-h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-normal normal-case tracking-normal text-[var(--ink)]"
            />
          </label>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
              Photos (required · {sub.photos?.length ?? 0}/{maxPhotos})
            </p>
            {(sub.photos?.length ?? 0) > 0 && (
              <ul className="grid grid-cols-3 gap-2">
                {sub.photos.map((photo) => (
                  <li
                    key={photo.id}
                    className="relative overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)]"
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
                      onClick={() =>
                        onUpdate({
                          photos: sub.photos.filter((p) => p.id !== photo.id),
                        })
                      }
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
                  "flex min-h-14 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[var(--line)] bg-[var(--surface)] text-center",
                  atLimit ? "pointer-events-none opacity-40" : "",
                ].join(" ")}
              >
                <span className="text-xs font-semibold text-[var(--ink)]">
                  Gallery
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  disabled={photoBusy || atLimit}
                  onChange={(e) => {
                    void addPhotos(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
              <label
                className={[
                  "flex min-h-14 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[var(--line)] bg-[var(--surface)] text-center",
                  atLimit ? "pointer-events-none opacity-40" : "",
                ].join(" ")}
              >
                <span className="text-xs font-semibold text-[var(--ink)]">
                  Camera
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  disabled={photoBusy || atLimit}
                  onChange={(e) => {
                    void addPhotos(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            {photoBusy && (
              <p className="text-center text-[11px] text-[var(--ink-muted)]">
                Compressing photos…
              </p>
            )}
            {photoHint && (
              <p className="text-xs font-medium text-[var(--risk)]" role="alert">
                {photoHint}
              </p>
            )}
          </div>
        </div>
      )}
      </StepSection>

      <StepSection step={2} title="Action taken" hint="Select all that apply">
        <ChipGroup
          options={SUBAREA_ACTIONS}
          selected={sub.actions}
          onChange={(actions) => onUpdate({ actions })}
        />
        <label className="mt-2 block space-y-1 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
          Other action
          <input
            value={sub.actionOther}
            onChange={(e) => onUpdate({ actionOther: e.target.value })}
            placeholder="If not listed above…"
            className="mt-1 block min-h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 text-sm font-normal normal-case tracking-normal text-[var(--ink)] outline-none focus:border-[var(--accent)]"
          />
        </label>

        {subAreaNeedsChemical(sub) && (
          <div className="mt-3 space-y-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
              Chemical used
            </p>
            <ChipGroup
              options={TREATMENT_PRODUCT_NAMES}
              selected={
                sub.treatment?.product ? [sub.treatment.product] : []
              }
              onChange={(next) => {
                const product = next[0] ?? "";
                const catalog = getTreatmentCatalogItem(product);
                onUpdate({
                  treatment: {
                    product,
                    method: catalog?.method ?? sub.treatment?.method ?? "",
                    activeIngredient:
                      catalog?.activeIngredient ??
                      sub.treatment?.activeIngredient ??
                      "",
                    antidote:
                      catalog?.antidote ?? sub.treatment?.antidote ?? "",
                    quantity: "",
                  },
                });
              }}
              multi={false}
              searchable
              placeholder="Product…"
            />
            <ChipGroup
              options={TREATMENT_APPLICATION_METHODS}
              selected={sub.treatment?.method ? [sub.treatment.method] : []}
              onChange={(next) =>
                onUpdate({
                  treatment: {
                    ...(sub.treatment ?? emptyTreatmentRow()),
                    method: next[0] ?? "",
                  },
                })
              }
              multi={false}
              searchable
              placeholder="Method…"
            />
          </div>
        )}
      </StepSection>

      <StepSection step={3} title="Recommendation">
        <ChipGroup
          options={ADVICE_OPTIONS}
          selected={sub.recommendation ? [sub.recommendation] : []}
          onChange={(next) => onUpdate({ recommendation: next[0] ?? "" })}
          multi={false}
        />
        {!sub.recommendation && !sub.recommendationOther && adviceHint && (
          <p className="mt-1 text-[11px] text-[var(--ink-muted)]">
            Suggested: {adviceHint}
          </p>
        )}
        <label className="mt-2 block space-y-1 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
          Other recommendation
          <input
            value={sub.recommendationOther}
            onChange={(e) =>
              onUpdate({ recommendationOther: e.target.value })
            }
            placeholder="If not listed above…"
            className="mt-1 block min-h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 text-sm font-normal normal-case tracking-normal text-[var(--ink)] outline-none focus:border-[var(--accent)]"
          />
        </label>

        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
            Photo (optional · {sub.recommendationPhotos?.length ?? 0}/
            {maxPhotos})
          </p>
          {(sub.recommendationPhotos?.length ?? 0) > 0 && (
            <ul className="grid grid-cols-3 gap-2">
              {sub.recommendationPhotos.map((photo) => (
                <li
                  key={photo.id}
                  className="relative overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)]"
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
                    onClick={() =>
                      onUpdate({
                        recommendationPhotos: sub.recommendationPhotos.filter(
                          (p) => p.id !== photo.id,
                        ),
                      })
                    }
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
                "flex min-h-14 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[var(--line)] bg-[var(--surface)] text-center",
                recAtLimit ? "pointer-events-none opacity-40" : "",
              ].join(" ")}
            >
              <span className="text-xs font-semibold text-[var(--ink)]">
                Gallery
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                disabled={photoBusy || recAtLimit}
                onChange={(e) => {
                  void addPhotos(e.target.files, "recommendationPhotos");
                  e.target.value = "";
                }}
              />
            </label>
            <label
              className={[
                "flex min-h-14 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[var(--line)] bg-[var(--surface)] text-center",
                recAtLimit ? "pointer-events-none opacity-40" : "",
              ].join(" ")}
            >
              <span className="text-xs font-semibold text-[var(--ink)]">
                Camera
              </span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                disabled={photoBusy || recAtLimit}
                onChange={(e) => {
                  void addPhotos(e.target.files, "recommendationPhotos");
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          {photoBusy && (
            <p className="text-center text-[11px] text-[var(--ink-muted)]">
              Compressing photos…
            </p>
          )}
          {photoHint && (
            <p className="text-xs font-medium text-[var(--risk)]" role="alert">
              {photoHint}
            </p>
          )}
        </div>
      </StepSection>
      </div>
      )}
    </div>
  );
}

function FcuRollupEditor({
  device,
  onDeviceChange,
}: {
  device: DeviceService;
  onDeviceChange: (patch: Partial<DeviceService>) => void;
}) {
  const units = device.units ?? [];

  function updateException(id: string, patch: Partial<DeviceUnit>) {
    onDeviceChange({
      units: units.map((u) => (u.id === id ? { ...u, ...patch } : u)),
    });
  }

  function addException() {
    const unit = emptyDeviceUnit(units.length + 1);
    onDeviceChange({
      allOperational: false,
      units: [...units, { ...unit, status: "obstructed", services: [] }],
    });
  }

  function removeException(id: string) {
    onDeviceChange({ units: units.filter((u) => u.id !== id) });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
        <p className="text-sm font-semibold text-[var(--ink)]">FCU roll-up</p>

        <label className="block space-y-1 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
          How many FCUs?
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={device.count}
            onChange={(e) =>
              onDeviceChange({
                count: e.target.value.replace(/\D/g, ""),
              })
            }
            placeholder="e.g. 7"
            className="mt-1 block min-h-11 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 text-sm font-normal normal-case tracking-normal text-[var(--ink)] outline-none focus:border-[var(--accent)]"
          />
        </label>

        <Field label="Services done">
          <ChipGroup
            options={FCU_ACTIONS}
            selected={device.actions}
            onChange={(actions) => onDeviceChange({ actions })}
          />
        </Field>

        <Field label="All units working / good condition?">
          <YesNo
            value={device.allOperational}
            onChange={(allOperational) =>
              onDeviceChange({
                allOperational,
                units: allOperational ? [] : units,
              })
            }
          />
        </Field>

        <Field label="Fly catch since last service">
          <ChipGroup
            options={FCU_CATCH_LEVEL_OPTIONS.map((o) => o.label)}
            selected={
              device.catchLevel
                ? [
                    FCU_CATCH_LEVEL_OPTIONS.find(
                      (o) => o.id === device.catchLevel,
                    )?.label ?? "",
                  ].filter(Boolean)
                : []
            }
            onChange={(next) => {
              const selected = next[0];
              const id = (FCU_CATCH_LEVEL_OPTIONS.find(
                (o) => o.label === selected,
              )?.id ?? null) as FcuCatchLevel;
              onDeviceChange({ catchLevel: id });
            }}
            multi={false}
          />
        </Field>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-[var(--ink)]">
            Exception units
          </p>
          <p className="text-xs text-[var(--ink-muted)]">
            Only if one is obstructed / damaged / not working
          </p>
        </div>
        {units.map((unit, index) => (
          <FcuExceptionCard
            key={unit.id}
            index={index}
            unit={unit}
            onUpdate={(patch) => updateException(unit.id, patch)}
            onRemove={() => removeException(unit.id)}
          />
        ))}
        <button
          type="button"
          onClick={addException}
          className="min-h-11 w-full rounded-lg border border-dashed border-[var(--line)] bg-[var(--surface)] text-sm font-semibold text-[var(--ink)]"
        >
          + Log exception unit
        </button>
      </div>
    </div>
  );
}

function FcuExceptionCard({
  index,
  unit,
  onUpdate,
  onRemove,
}: {
  index: number;
  unit: DeviceUnit;
  onUpdate: (patch: Partial<DeviceUnit>) => void;
  onRemove: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoHint, setPhotoHint] = useState<string | null>(null);
  const maxPhotos = maxPhotosPerDeviceUnit();
  const atLimit = (unit.photos?.length ?? 0) >= maxPhotos;
  const label =
    [unit.label.trim() && `FCU ${unit.label.trim()}`, unit.location.trim()]
      .filter(Boolean)
      .join(" · ") || `Exception ${index + 1}`;

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setPhotoBusy(true);
    setPhotoHint(null);
    try {
      const { photos: incoming, errors } = await compressImageFiles(files);
      const { photos, truncated } = mergeAreaPhotos(
        unit.photos ?? [],
        incoming,
        maxPhotos,
      );
      onUpdate({ photos });
      const messages = [...errors];
      if (truncated > 0) {
        messages.push(`Limit is ${maxPhotos} photos per unit`);
      }
      setPhotoHint(messages[0] ?? null);
    } finally {
      setPhotoBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--bg)] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--ink)]">
          Exception {index + 1}
        </p>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="text-xs font-semibold text-[var(--risk)]"
        >
          Remove
        </button>
      </div>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="presentation"
        >
          <button
            type="button"
            aria-label="Cancel remove"
            className="absolute inset-0 bg-[var(--ink)]/45"
            onClick={() => setConfirmOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-sm rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]"
          >
            <h3 className="text-base font-semibold text-[var(--ink)]">
              Remove this exception?
            </h3>
            <p className="mt-2 text-sm text-[var(--ink-muted)]">
              This will delete{" "}
              <span className="font-medium text-[var(--ink)]">{label}</span>.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="min-h-11 rounded-lg border border-[var(--line)] text-sm font-semibold text-[var(--ink)]"
              >
                Keep
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmOpen(false);
                  onRemove();
                }}
                className="min-h-11 rounded-lg bg-[var(--risk)] text-sm font-semibold text-[var(--accent-ink)]"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
          FCU number
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={unit.label}
            onChange={(e) =>
              onUpdate({ label: e.target.value.replace(/\D/g, "") })
            }
            placeholder="e.g. 3"
            className="mt-1 block min-h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-normal normal-case tracking-normal text-[var(--ink)]"
          />
        </label>
        <label className="block space-y-1 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
          Location
          <input
            value={unit.location}
            onChange={(e) => onUpdate({ location: e.target.value })}
            placeholder="e.g. Receiving area"
            className="mt-1 block min-h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-normal normal-case tracking-normal text-[var(--ink)]"
          />
        </label>
      </div>

      <Field label="Condition">
        <ChipGroup
          options={DEVICE_UNIT_STATUS_OPTIONS.map((o) => o.label)}
          selected={[
            DEVICE_UNIT_STATUS_OPTIONS.find((o) => o.id === unit.status)
              ?.label ?? "Obstructed",
          ]}
          onChange={(next) => {
            const selected = next[0];
            const id =
              DEVICE_UNIT_STATUS_OPTIONS.find((o) => o.label === selected)
                ?.id ?? "obstructed";
            onUpdate({ status: id });
          }}
          multi={false}
        />
      </Field>

      <label className="block space-y-1 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
        Note
        <input
          value={unit.note}
          onChange={(e) => onUpdate({ note: e.target.value })}
          placeholder="e.g. Obstructed by stored equipment"
          className="mt-1 block min-h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-normal normal-case tracking-normal text-[var(--ink)]"
        />
      </label>

      <label className="block space-y-1 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
        Advice (optional)
        <textarea
          value={unit.recommendation}
          onChange={(e) => onUpdate({ recommendation: e.target.value })}
          rows={2}
          placeholder="e.g. Keep this area clear of stored equipment…"
          className="mt-1 block min-h-16 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-normal normal-case tracking-normal text-[var(--ink)]"
        />
      </label>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
          Photos (required · {unit.photos?.length ?? 0}/{maxPhotos})
        </p>
        {(unit.photos?.length ?? 0) > 0 && (
          <ul className="grid grid-cols-3 gap-2">
            {unit.photos.map((photo) => (
              <li
                key={photo.id}
                className="relative overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)]"
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
                  onClick={() =>
                    onUpdate({
                      photos: unit.photos.filter((p) => p.id !== photo.id),
                    })
                  }
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
              "flex min-h-14 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[var(--line)] bg-[var(--surface)] text-center",
              atLimit ? "pointer-events-none opacity-40" : "",
            ].join(" ")}
          >
            <span className="text-xs font-semibold text-[var(--ink)]">
              Gallery
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              disabled={photoBusy || atLimit}
              onChange={(e) => {
                void addPhotos(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
          <label
            className={[
              "flex min-h-14 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[var(--line)] bg-[var(--surface)] text-center",
              atLimit ? "pointer-events-none opacity-40" : "",
            ].join(" ")}
          >
            <span className="text-xs font-semibold text-[var(--ink)]">
              Camera
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              disabled={photoBusy || atLimit}
              onChange={(e) => {
                void addPhotos(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        {photoBusy && (
          <p className="text-center text-[11px] text-[var(--ink-muted)]">
            Compressing photos…
          </p>
        )}
        {photoHint && (
          <p className="text-xs font-medium text-[var(--risk)]" role="alert">
            {photoHint}
          </p>
        )}
      </div>
    </div>
  );
}

function BaitRollupEditor({
  device,
  onDeviceChange,
}: {
  device: DeviceService;
  onDeviceChange: (patch: Partial<DeviceService>) => void;
}) {
  const units = device.units ?? [];

  function updateException(id: string, patch: Partial<DeviceUnit>) {
    onDeviceChange({
      units: units.map((u) => (u.id === id ? { ...u, ...patch } : u)),
    });
  }

  function addException() {
    const unit = emptyDeviceUnit(units.length + 1);
    onDeviceChange({
      allOperational: false,
      units: [...units, { ...unit, status: "obstructed", services: [] }],
    });
  }

  function removeException(id: string) {
    onDeviceChange({ units: units.filter((u) => u.id !== id) });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
        <p className="text-sm font-semibold text-[var(--ink)]">
          Station roll-up
        </p>

        <label className="block space-y-1 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
          How many stations?
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={device.count}
            onChange={(e) =>
              onDeviceChange({
                count: e.target.value.replace(/\D/g, ""),
              })
            }
            placeholder="e.g. 12"
            className="mt-1 block min-h-11 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 text-sm font-normal normal-case tracking-normal text-[var(--ink)] outline-none focus:border-[var(--accent)]"
          />
        </label>

        <Field label="Services done">
          <ChipGroup
            options={DEVICE_ACTIONS}
            selected={device.actions}
            onChange={(actions) => onDeviceChange({ actions })}
          />
        </Field>

        <Field label="All stations good condition?">
          <YesNo
            value={device.allOperational}
            onChange={(allOperational) =>
              onDeviceChange({
                allOperational,
                units: allOperational ? [] : units,
              })
            }
          />
        </Field>

        <Field label="Rodent activity (area overall)">
          <ChipGroup
            options={DEVICE_UNIT_ACTIVITY_OPTIONS.map((o) => o.label)}
            selected={
              device.rodentActivity
                ? [
                    DEVICE_UNIT_ACTIVITY_OPTIONS.find(
                      (o) => o.id === device.rodentActivity,
                    )?.label ?? "",
                  ].filter(Boolean)
                : []
            }
            onChange={(next) => {
              const selected = next[0];
              const id = (DEVICE_UNIT_ACTIVITY_OPTIONS.find(
                (o) => o.label === selected,
              )?.id ?? null) as DeviceUnitActivity;
              onDeviceChange({ rodentActivity: id });
            }}
            multi={false}
          />
        </Field>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-[var(--ink)]">
            Exception stations
          </p>
          <p className="text-xs text-[var(--ink-muted)]">
            Only if damaged / missing / needs photos
          </p>
        </div>
        {units.map((unit, index) => (
          <BaitExceptionCard
            key={unit.id}
            index={index}
            unit={unit}
            onUpdate={(patch) => updateException(unit.id, patch)}
            onRemove={() => removeException(unit.id)}
          />
        ))}
        <button
          type="button"
          onClick={addException}
          className="min-h-11 w-full rounded-lg border border-dashed border-[var(--line)] bg-[var(--surface)] text-sm font-semibold text-[var(--ink)]"
        >
          + Log exception station
        </button>
      </div>
    </div>
  );
}

function BaitExceptionCard({
  index,
  unit,
  onUpdate,
  onRemove,
}: {
  index: number;
  unit: DeviceUnit;
  onUpdate: (patch: Partial<DeviceUnit>) => void;
  onRemove: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoHint, setPhotoHint] = useState<string | null>(null);
  const maxPhotos = maxPhotosPerDeviceUnit();
  const atLimit = (unit.photos?.length ?? 0) >= maxPhotos;
  const label =
    [
      unit.label.trim() && `Station ${unit.label.trim()}`,
      unit.location.trim(),
    ]
      .filter(Boolean)
      .join(" · ") || `Exception ${index + 1}`;

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setPhotoBusy(true);
    setPhotoHint(null);
    try {
      const { photos: incoming, errors } = await compressImageFiles(files);
      const { photos, truncated } = mergeAreaPhotos(
        unit.photos ?? [],
        incoming,
        maxPhotos,
      );
      onUpdate({ photos });
      const messages = [...errors];
      if (truncated > 0) {
        messages.push(`Limit is ${maxPhotos} photos per station`);
      }
      setPhotoHint(messages[0] ?? null);
    } finally {
      setPhotoBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--bg)] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--ink)]">
          Exception {index + 1}
        </p>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="text-xs font-semibold text-[var(--risk)]"
        >
          Remove
        </button>
      </div>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="presentation"
        >
          <button
            type="button"
            aria-label="Cancel remove"
            className="absolute inset-0 bg-[var(--ink)]/45"
            onClick={() => setConfirmOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-sm rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]"
          >
            <h3 className="text-base font-semibold text-[var(--ink)]">
              Remove this exception?
            </h3>
            <p className="mt-2 text-sm text-[var(--ink-muted)]">
              This will delete{" "}
              <span className="font-medium text-[var(--ink)]">{label}</span>.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="min-h-11 rounded-lg border border-[var(--line)] text-sm font-semibold text-[var(--ink)]"
              >
                Keep
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmOpen(false);
                  onRemove();
                }}
                className="min-h-11 rounded-lg bg-[var(--risk)] text-sm font-semibold text-[var(--accent-ink)]"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
          Station number
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={unit.label}
            onChange={(e) =>
              onUpdate({ label: e.target.value.replace(/\D/g, "") })
            }
            placeholder="e.g. 3"
            className="mt-1 block min-h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-normal normal-case tracking-normal text-[var(--ink)]"
          />
        </label>
        <label className="block space-y-1 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
          Location
          <input
            value={unit.location}
            onChange={(e) => onUpdate({ location: e.target.value })}
            placeholder="e.g. Receiving area"
            className="mt-1 block min-h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-normal normal-case tracking-normal text-[var(--ink)]"
          />
        </label>
      </div>

      <Field label="Condition">
        <ChipGroup
          options={DEVICE_UNIT_STATUS_OPTIONS.map((o) => o.label)}
          selected={[
            DEVICE_UNIT_STATUS_OPTIONS.find((o) => o.id === unit.status)
              ?.label ?? "Obstructed",
          ]}
          onChange={(next) => {
            const selected = next[0];
            const id =
              DEVICE_UNIT_STATUS_OPTIONS.find((o) => o.label === selected)
                ?.id ?? "obstructed";
            onUpdate({ status: id });
          }}
          multi={false}
        />
      </Field>

      <Field label="Activity at this station (optional)">
        <ChipGroup
          options={DEVICE_UNIT_ACTIVITY_OPTIONS.map((o) => o.label)}
          selected={
            unit.activity
              ? [
                  DEVICE_UNIT_ACTIVITY_OPTIONS.find(
                    (o) => o.id === unit.activity,
                  )?.label ?? "",
                ].filter(Boolean)
              : []
          }
          onChange={(next) => {
            const selected = next[0];
            const id = (DEVICE_UNIT_ACTIVITY_OPTIONS.find(
              (o) => o.label === selected,
            )?.id ?? null) as DeviceUnitActivity;
            onUpdate({ activity: id });
          }}
          multi={false}
        />
      </Field>

      <label className="block space-y-1 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
        Note
        <input
          value={unit.note}
          onChange={(e) => onUpdate({ note: e.target.value })}
          placeholder="e.g. Station crushed / needs replacement"
          className="mt-1 block min-h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-normal normal-case tracking-normal text-[var(--ink)]"
        />
      </label>

      <label className="block space-y-1 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
        Advice (optional)
        <textarea
          value={unit.recommendation}
          onChange={(e) => onUpdate({ recommendation: e.target.value })}
          rows={2}
          placeholder={baitStationAdviceSuggestion(unit)}
          className="mt-1 block min-h-16 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-normal normal-case tracking-normal text-[var(--ink)]"
        />
      </label>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
          Photos (required · {unit.photos?.length ?? 0}/{maxPhotos})
        </p>
        {(unit.photos?.length ?? 0) > 0 && (
          <ul className="grid grid-cols-3 gap-2">
            {unit.photos.map((photo) => (
              <li
                key={photo.id}
                className="relative overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)]"
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
                  onClick={() =>
                    onUpdate({
                      photos: unit.photos.filter((p) => p.id !== photo.id),
                    })
                  }
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
              "flex min-h-14 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[var(--line)] bg-[var(--surface)] text-center",
              atLimit ? "pointer-events-none opacity-40" : "",
            ].join(" ")}
          >
            <span className="text-xs font-semibold text-[var(--ink)]">
              Gallery
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              disabled={photoBusy || atLimit}
              onChange={(e) => {
                void addPhotos(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
          <label
            className={[
              "flex min-h-14 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[var(--line)] bg-[var(--surface)] text-center",
              atLimit ? "pointer-events-none opacity-40" : "",
            ].join(" ")}
          >
            <span className="text-xs font-semibold text-[var(--ink)]">
              Camera
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              disabled={photoBusy || atLimit}
              onChange={(e) => {
                void addPhotos(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        {photoBusy && (
          <p className="text-center text-[11px] text-[var(--ink-muted)]">
            Compressing photos…
          </p>
        )}
        {photoHint && (
          <p className="text-xs font-medium text-[var(--risk)]" role="alert">
            {photoHint}
          </p>
        )}
      </div>
    </div>
  );
}

function DeviceUnitsEditor({
  units,
  onChange,
}: {
  units: DeviceUnit[];
  onChange: (units: DeviceUnit[]) => void;
}) {
  function updateUnit(id: string, patch: Partial<DeviceUnit>) {
    onChange(units.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-[var(--ink-muted)]">
        Log each unit / station (ID, location, status, service). Exception units
        appear in the report.
      </p>
      {units.map((unit, index) => (
        <div
          key={unit.id}
          className="space-y-3 rounded-lg border border-[var(--line)] bg-[var(--bg)] p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[var(--ink)]">
              Unit {index + 1}
            </p>
            <button
              type="button"
              className="text-xs font-semibold text-[var(--ink-muted)]"
              onClick={() => onChange(units.filter((u) => u.id !== unit.id))}
              disabled={units.length <= 1}
            >
              Remove
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
              ID / number
              <input
                value={unit.label}
                onChange={(e) => updateUnit(unit.id, { label: e.target.value })}
                placeholder="e.g. 1"
                className="mt-1 block min-h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-normal normal-case tracking-normal text-[var(--ink)]"
              />
            </label>
            <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
              Location
              <input
                value={unit.location}
                onChange={(e) =>
                  updateUnit(unit.id, { location: e.target.value })
                }
                placeholder="e.g. Receiving area"
                className="mt-1 block min-h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-normal normal-case tracking-normal text-[var(--ink)]"
              />
            </label>
          </div>
          <Field label="Status">
            <ChipGroup
              options={DEVICE_UNIT_STATUS_OPTIONS.map((o) => o.label)}
              selected={[
                DEVICE_UNIT_STATUS_OPTIONS.find((o) => o.id === unit.status)
                  ?.label ?? "OK / good condition",
              ]}
              onChange={(next) => {
                const label = next[0];
                const id =
                  DEVICE_UNIT_STATUS_OPTIONS.find((o) => o.label === label)
                    ?.id ?? "ok";
                updateUnit(unit.id, { status: id });
              }}
              multi={false}
              searchable
              placeholder="Status…"
            />
          </Field>
          <Field label="Services">
            <ChipGroup
              options={DEVICE_ACTIONS}
              selected={unit.services}
              onChange={(services) => updateUnit(unit.id, { services })}
            />
          </Field>
          <label className="block space-y-1 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
            Note
            <input
              value={unit.note}
              onChange={(e) => updateUnit(unit.id, { note: e.target.value })}
              placeholder="e.g. Obstructed by stored equipment"
              className="mt-1 block min-h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-normal normal-case tracking-normal text-[var(--ink)]"
            />
          </label>
        </div>
      ))}
      <button
        type="button"
        className="text-sm font-semibold text-[var(--accent-deep)]"
        onClick={() => onChange([...units, emptyDeviceUnit(units.length + 1)])}
      >
        + Add unit
      </button>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
          {label}
        </p>
        {hint ? (
          <p className="text-[11px] font-medium normal-case tracking-normal text-[var(--ink-muted)]">
            {hint}
          </p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function StepSection({
  step,
  title,
  hint,
  children,
}: {
  step: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-lg border border-[var(--line)] bg-[var(--bg)] p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] text-[11px] font-bold text-[var(--bg)]">
            {step}
          </span>
          <p className="text-sm font-semibold text-[var(--ink)]">{title}</p>
        </div>
        {hint ? (
          <p className="shrink-0 text-[11px] font-medium text-[var(--ink-muted)]">
            {hint}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
