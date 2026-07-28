import { getPointTemplates } from "./area-points";
import {
  mapLegacyEvidence,
  mapLegacyFinding,
  mapLegacyPest,
  rollupActionTier,
  rollupThreshold,
  suggestRecommendation,
  type ActionTier,
  type ConduciveType,
  type EvidenceId,
  type PestTypeId,
  type PointOutcome,
  type ThresholdLevel,
  type TreatmentApplied,
  pestTypeLabel,
  conduciveLabel,
} from "./ipm";

export type VisitType = "full_inspection" | "follow_up";
export type VisitStatus = "scheduled" | "in_progress" | "submitted";
export type AreaStatus = "clean" | "issues";

export type Site = {
  id: string;
  clientName: string;
  siteName: string;
  /** Site-specific checklist — not a global catalog */
  areas: string[];
};

export type ScheduledVisit = {
  id: string;
  siteId: string;
  visitType: VisitType;
  technicianName: string;
  date: string;
  followUpAreas?: string[];
  status: VisitStatus;
  timeWindow?: string;
  /** Optional brief / instructions for the technician */
  notes?: string;
  /** For follow-ups: original visit id this job continues */
  parentVisitId?: string;
};

export type TreatmentApplication = {
  product: string;
  method: string;
  activeIngredient: string;
  antidote: string;
  quantity: string;
};

export type DeviceService = {
  enabled: boolean;
  count: string;
  actions: string[];
};

/** Nested IPM inspection point (schema v2) */
export type InspectionPoint = {
  pointId: string;
  label: string;
  outcome: PointOutcome | null;
  identification: {
    pestType: PestTypeId;
    evidence: EvidenceId;
  };
  thresholdLevel: ThresholdLevel;
  conduciveCondition: {
    present: boolean;
    type: ConduciveType;
  };
  actionTier: ActionTier;
  note: string;
  /** Count only for now — photo_ids come with real storage */
  photoCount: number;
  phraseClean: string;
  phraseIssue: string;
};

export type AreaInspection = {
  area: string;
  /** Nested inspection points */
  points: InspectionPoint[];
  /** Area-level treatment class — chemical detail lives in treatment.applications */
  treatmentApplied: TreatmentApplied;
  treatment: {
    applications: TreatmentApplication[];
    serviceActions: string[];
  };
  deviceService: DeviceService;
  /** Editable auto-suggested recommendation */
  recommendation: string;
  notes: string;
  photoCount: number;
  /**
   * Derived roll-ups for dashboard / reports compat
   * (kept in sync by normalizeAreaInspection)
   */
  status: AreaStatus | null;
  findings: string[];
  pestTypes: string[];
  advice: string[];
};

export type VisitDraft = {
  visitId: string;
  /** All checklist areas for this visit (any-order capture) */
  areas: AreaInspection[];
  updatedAt: string;
  submittedAt?: string;
};

export function emptyTreatmentRow(): TreatmentApplication {
  return {
    product: "",
    method: "",
    activeIngredient: "",
    antidote: "",
    quantity: "",
  };
}

export function emptyInspectionPoint(
  pointId: string,
  label: string,
  phraseClean = "",
  phraseIssue = "",
): InspectionPoint {
  return {
    pointId,
    label,
    outcome: null,
    identification: { pestType: null, evidence: null },
    thresholdLevel: "none",
    conduciveCondition: { present: false, type: null },
    actionTier: "monitor",
    note: "",
    photoCount: 0,
    phraseClean,
    phraseIssue,
  };
}

export function emptyPointsForArea(area: string): InspectionPoint[] {
  return getPointTemplates(area).map((t) =>
    emptyInspectionPoint(t.pointId, t.label, t.phraseClean, t.phraseIssue),
  );
}

export function emptyAreaInspection(area = ""): AreaInspection {
  return {
    area,
    points: area ? emptyPointsForArea(area) : [],
    treatmentApplied: "none",
    treatment: { applications: [], serviceActions: [] },
    deviceService: { enabled: false, count: "", actions: [] },
    recommendation: "",
    notes: "",
    photoCount: 0,
    status: null,
    findings: [],
    pestTypes: [],
    advice: [],
  };
}

export function normalizeTreatment(
  raw: AreaInspection["treatment"] | Record<string, unknown> | undefined,
): AreaInspection["treatment"] {
  if (!raw || typeof raw !== "object") {
    return { applications: [], serviceActions: [] };
  }
  const t = raw as Record<string, unknown>;
  if (Array.isArray(t.applications) || Array.isArray(t.serviceActions)) {
    return {
      applications: Array.isArray(t.applications)
        ? (t.applications as TreatmentApplication[])
        : [],
      serviceActions: Array.isArray(t.serviceActions)
        ? (t.serviceActions as string[])
        : [],
    };
  }
  const methods = Array.isArray(t.methods) ? (t.methods as string[]) : [];
  const product = typeof t.product === "string" ? t.product.trim() : "";
  const quantity = typeof t.quantity === "string" ? t.quantity : "";
  return {
    applications: product
      ? [
          {
            product,
            method: methods[0] ?? "",
            activeIngredient: "",
            antidote: "",
            quantity,
          },
        ]
      : [],
    serviceActions: product ? methods.slice(1) : methods,
  };
}

function normalizePoint(raw: unknown, fallback: InspectionPoint): InspectionPoint {
  if (!raw || typeof raw !== "object") return fallback;
  const r = raw as Record<string, unknown>;
  const id = r.identification as
    | { pestType?: PestTypeId; evidence?: EvidenceId }
    | undefined;
  const cc = r.conduciveCondition as
    | { present?: boolean; type?: ConduciveType }
    | undefined;
  return {
    pointId:
      typeof r.pointId === "string"
        ? r.pointId
        : typeof r.point_id === "string"
          ? r.point_id
          : fallback.pointId,
    label: typeof r.label === "string" ? r.label : fallback.label,
    outcome: (r.outcome as PointOutcome | null) ?? null,
    identification: {
      pestType: id?.pestType ?? null,
      evidence: id?.evidence ?? null,
    },
    thresholdLevel: (r.thresholdLevel as ThresholdLevel) ??
      (r.threshold_level as ThresholdLevel) ??
      "none",
    conduciveCondition: {
      present: Boolean(cc?.present),
      type: cc?.type ?? null,
    },
    actionTier:
      (r.actionTier as ActionTier) ??
      (r.action_tier as ActionTier) ??
      "monitor",
    note: typeof r.note === "string" ? r.note : "",
    photoCount:
      typeof r.photoCount === "number"
        ? r.photoCount
        : Array.isArray(r.photo_ids)
          ? (r.photo_ids as unknown[]).length
          : 0,
    phraseClean:
      typeof r.phraseClean === "string"
        ? r.phraseClean
        : typeof r.phrase_clean === "string"
          ? r.phrase_clean
          : fallback.phraseClean,
    phraseIssue:
      typeof r.phraseIssue === "string"
        ? r.phraseIssue
        : typeof r.phrase_issue === "string"
          ? r.phrase_issue
          : fallback.phraseIssue,
  };
}

function migrateLegacyToPoints(
  area: string,
  status: AreaStatus | null,
  findings: string[],
  pestTypes: string[],
  notes: string,
  photoCount: number,
): InspectionPoint[] {
  const templates = emptyPointsForArea(area);
  if (!status) return templates;

  if (status === "clean") {
    return templates.map((p) => ({
      ...p,
      outcome: "clean" as const,
      thresholdLevel: "none" as const,
      actionTier: "monitor" as const,
    }));
  }

  // Put legacy issue detail on the first point; remaining start clean/unset
  const [first, ...rest] = templates;
  const pest = pestTypes.map(mapLegacyPest).find(Boolean) ?? null;
  const finding = findings[0] ? mapLegacyFinding(findings[0]) : null;
  const evidence = mapLegacyEvidence(pestTypes.join(" ") || findings.join(" "));

  const issuePoint: InspectionPoint = {
    ...first,
    outcome: "issue",
    identification: { pestType: pest, evidence },
    thresholdLevel: "light",
    conduciveCondition: {
      present: Boolean(finding),
      type: finding,
    },
    actionTier: "targeted_treatment",
    note: notes,
    photoCount,
  };

  return [
    issuePoint,
    ...rest.map((p) => ({
      ...p,
      outcome: "clean" as const,
      thresholdLevel: "none" as const,
      actionTier: "monitor" as const,
    })),
  ];
}

/** Derive dashboard-compatible roll-ups from points */
export function deriveAreaRollups(points: InspectionPoint[]): {
  status: AreaStatus | null;
  findings: string[];
  pestTypes: string[];
  overallThreshold: ThresholdLevel;
  overallActionTier: ActionTier;
} {
  if (points.length === 0 || points.every((p) => p.outcome === null)) {
    return {
      status: null,
      findings: [],
      pestTypes: [],
      overallThreshold: "none",
      overallActionTier: "monitor",
    };
  }
  const started = points.filter((p) => p.outcome !== null);
  const hasIssue = started.some((p) => p.outcome === "issue");
  const status: AreaStatus = hasIssue ? "issues" : "clean";
  const issuePoints = points.filter((p) => p.outcome === "issue");
  const findings = [
    ...new Set(
      issuePoints
        .filter((p) => p.conduciveCondition.present && p.conduciveCondition.type)
        .map((p) => conduciveLabel(p.conduciveCondition.type)),
    ),
  ];
  const pestTypes = [
    ...new Set(
      issuePoints
        .map((p) => pestTypeLabel(p.identification.pestType))
        .filter(Boolean),
    ),
  ];
  const overallThreshold = rollupThreshold(
    (hasIssue ? issuePoints : started).map((p) => p.thresholdLevel),
  );
  const overallActionTier = rollupActionTier(
    (hasIssue ? issuePoints : started).map((p) => p.actionTier),
  );
  return {
    status,
    findings,
    pestTypes,
    overallThreshold,
    overallActionTier,
  };
}

export function syncAreaDerivedFields(area: AreaInspection): AreaInspection {
  const roll = deriveAreaRollups(area.points);
  const apps = normalizeTreatment(area.treatment).applications.filter(
    (a) => a.product.trim(),
  );
  let treatmentApplied = area.treatmentApplied;
  if (apps.length > 0 && treatmentApplied === "none") {
    treatmentApplied =
      roll.overallActionTier === "targeted_treatment" ||
      roll.overallActionTier === "escalation"
        ? "corrective"
        : "preventive";
  }
  if (apps.length === 0 && treatmentApplied !== "none") {
    // keep explicit none/preventive/corrective if set without products
  }

  let recommendation = area.recommendation.trim();
  if (!recommendation && roll.status !== null) {
    recommendation = suggestRecommendation(
      roll.overallThreshold,
      roll.overallActionTier,
    );
  }

  const advice = recommendation ? [recommendation] : [];

  return {
    ...area,
    treatmentApplied,
    recommendation,
    status: roll.status,
    findings: roll.findings,
    pestTypes: roll.pestTypes,
    advice,
  };
}

/** Migrate legacy drafts / seed records into schema v2 area shape */
export function normalizeAreaInspection(
  raw: unknown,
  areaName = "",
): AreaInspection {
  const base = emptyAreaInspection(areaName);
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;
  const area = typeof r.area === "string" ? r.area : areaName;
  const treatment = normalizeTreatment(
    r.treatment as AreaInspection["treatment"],
  );
  const device =
    (r.deviceService as DeviceService | undefined) ?? base.deviceService;

  const templates = emptyPointsForArea(area);
  let points: InspectionPoint[];

  if (Array.isArray(r.points) && r.points.length > 0) {
    const byId = new Map(
      (r.points as unknown[]).map((p) => {
        const n = normalizePoint(p, templates[0] ?? emptyInspectionPoint("x", area));
        return [n.pointId, n] as const;
      }),
    );
    points = templates.map(
      (t) =>
        byId.get(t.pointId) ??
        normalizePoint(
          (r.points as unknown[]).find(
            (p) =>
              p &&
              typeof p === "object" &&
              ((p as { label?: string }).label === t.label),
          ),
          emptyInspectionPoint(t.pointId, t.label, t.phraseClean, t.phraseIssue),
        ),
    );
    // keep any extra custom points
    for (const [id, p] of byId) {
      if (!points.some((x) => x.pointId === id)) points.push(p);
    }
  } else {
    // Legacy flat area → migrate into points
    const findings = Array.isArray(r.findings) ? (r.findings as string[]) : [];
    const pestTypes = Array.isArray(r.pestTypes)
      ? (r.pestTypes as string[])
      : Array.isArray((r.itemsFound as { pestTypes?: string[] })?.pestTypes)
        ? ((r.itemsFound as { pestTypes: string[] }).pestTypes)
        : [];
    let status = (r.status as AreaStatus | null) ?? null;
    if (!status && ("housekeeping" in r || "itemsFound" in r)) {
      const hk = r.housekeeping as
        | { rating?: string | null; conditions?: string[] }
        | undefined;
      const rating = hk?.rating;
      const conditions = (hk?.conditions ?? []).filter(
        (c) => c !== "None observed",
      );
      status =
        rating === "poor" || rating === "fair" || conditions.length > 0
          ? "issues"
          : rating === "good"
            ? "clean"
            : null;
      if (!findings.length && conditions.length) findings.push(...conditions);
    }
    const notes =
      typeof r.notes === "string"
        ? r.notes
        : typeof (r.observations as { notes?: string })?.notes === "string"
          ? (r.observations as { notes: string }).notes
          : "";
    const photoCount = typeof r.photoCount === "number" ? r.photoCount : 0;
    points = migrateLegacyToPoints(
      area,
      status,
      findings.length
        ? findings
        : Array.isArray(
              (r.housekeeping as { conditions?: string[] })?.conditions,
            )
          ? (
              (r.housekeeping as { conditions: string[] }).conditions ?? []
            ).filter((c) => c !== "None observed")
          : [],
      pestTypes.filter((p) => p !== "None observed"),
      notes,
      photoCount,
    );
  }

  const adviceArr = Array.isArray(r.advice)
    ? (r.advice as string[])
    : Array.isArray(r.recommendation)
      ? (r.recommendation as string[])
      : [];
  const recommendation =
    typeof r.recommendation === "string" && r.recommendation.trim()
      ? r.recommendation.trim()
      : adviceArr.find(
          (a) =>
            a === "Follow-up visit required" || a === "Client action needed",
        ) ??
        adviceArr[0] ??
        "";

  const treatmentApplied =
    (r.treatmentApplied as TreatmentApplied) ??
    (treatment.applications.some((a) => a.product)
      ? "preventive"
      : "none");

  return syncAreaDerivedFields({
    area,
    points,
    treatmentApplied,
    treatment,
    deviceService: {
      enabled: Boolean(device.enabled),
      count: device.count ?? "",
      actions: Array.isArray(device.actions) ? device.actions : [],
    },
    recommendation,
    notes:
      typeof r.notes === "string"
        ? r.notes
        : typeof (r.observations as { notes?: string })?.notes === "string"
          ? (r.observations as { notes: string }).notes
          : "",
    photoCount: typeof r.photoCount === "number" ? r.photoCount : 0,
    status: null,
    findings: [],
    pestTypes: [],
    advice: [],
  });
}

export function isDeviceArea(area: string): boolean {
  const a = area.toLowerCase();
  return /fly control|fcu|bait|monitoring|rodent|manhole|drain/.test(a);
}

export function isPointComplete(p: InspectionPoint): boolean {
  if (!p.outcome) return false;
  if (p.outcome === "clean") return true;
  // Issue: need threshold beyond none OR pest OR conducive
  if (
    p.thresholdLevel === "none" &&
    !p.identification.pestType &&
    !p.conduciveCondition.present
  ) {
    return false;
  }
  return true;
}

/** Area is complete enough to count toward visit progress */
export function isAreaComplete(insp: AreaInspection): boolean {
  const a = normalizeAreaInspection(insp, insp.area);
  if (a.points.length === 0) return false;
  if (!a.points.every(isPointComplete)) return false;

  const needsChemical = a.points.some(
    (p) => p.outcome === "issue" && p.actionTier === "targeted_treatment",
  );
  const apps = normalizeTreatment(a.treatment).applications.filter(
    (x) => x.product || x.method || x.quantity,
  );
  const completeApps = normalizeTreatment(a.treatment).applications.filter(
    (x) => x.product && x.method && x.quantity,
  );
  if (needsChemical && completeApps.length === 0) return false;
  for (const app of apps) {
    if (!app.product || !app.method || !app.quantity) return false;
  }
  if (a.deviceService.enabled) {
    if (!a.deviceService.count.trim()) return false;
    if (a.deviceService.actions.length === 0) return false;
  }
  return true;
}

export function allAreasComplete(areas: AreaInspection[]): boolean {
  return areas.length > 0 && areas.every(isAreaComplete);
}

/** Fill phrase_issue template placeholders */
export function renderPointPhrase(point: InspectionPoint): string {
  if (point.outcome === "clean") {
    return point.phraseClean || `${point.label} was found clean.`;
  }
  if (point.outcome !== "issue") return "";
  const pest = pestTypeLabel(point.identification.pestType) || "pest";
  const conducive = point.conduciveCondition.present
    ? conduciveLabel(point.conduciveCondition.type) || "conducive conditions"
    : "no specific conducive condition recorded";
  return (point.phraseIssue || `{threshold_level} {pest_type} activity at ${point.label}.`)
    .replace(/\{pest_type\}/g, pest.toLowerCase())
    .replace(/\{threshold_level\}/g, point.thresholdLevel)
    .replace(/\{conducive_condition\}/g, conducive.toLowerCase())
    .replace(/\{evidence\}/g, point.identification.evidence?.replace(/_/g, " ") ?? "activity")
    .replace(/\{action_tier\}/g, point.actionTier.replace(/_/g, " "));
}
