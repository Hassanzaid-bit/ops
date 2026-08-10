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
export type AssignmentMode = "solo" | "team";

import type { ChecklistArea } from "./site-checklist";

export type Site = {
  id: string;
  clientName: string;
  siteName: string;
  address: string;
  /** Checklist area → sub-area tree; leaves drive visit capture */
  checklistAreas: ChecklistArea[];
};

export type ScheduledVisit = {
  id: string;
  siteId: string;
  visitType: VisitType;
  /** Lead technician display name (Insectram-style primary tech) */
  technicianName: string;
  /** Lead PMP user id */
  technicianId?: string;
  /** solo (default) or team crew */
  assignmentMode?: AssignmentMode;
  /** Crew user ids; always includes lead when set. Empty/undefined = solo. */
  teamMemberIds?: string[];
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

export type DeviceUnitStatus =
  | "ok"
  | "dirty"
  | "water_damaged"
  | "obstructed"
  | "missing"
  | "needs_paint";

export type DeviceUnitActivity =
  | "none"
  | "feeding"
  | "droppings"
  | "bait_take"
  | "other"
  | null;

/** Compressed evidence photo stored on the area (data URL for offline drafts) */
export type AreaPhoto = {
  id: string;
  name: string;
  dataUrl: string;
  addedAt: string;
};

/** One physical FCU / monitoring station / bait station */
export type DeviceUnit = {
  id: string;
  /** Display id e.g. "No. 1" or "FCU-3" */
  label: string;
  /** Where on site e.g. "Receiving area" */
  location: string;
  status: DeviceUnitStatus;
  services: string[];
  /** Rodent activity observed at this station (bait / monitoring) */
  activity: DeviceUnitActivity;
  /** Per-station advice (bait / monitoring areas) */
  recommendation: string;
  note: string;
  photos: AreaPhoto[];
};

export type FcuCatchLevel =
  | "low"
  | "medium"
  | "high"
  | "light_boards"
  | null;

export type DeviceService = {
  enabled: boolean;
  /** Roll-up count (FCU / bait) or derived from units when omitted */
  count: string;
  /** Roll-up services across the visit */
  actions: string[];
  /**
   * FCU / bait: exception units only.
   * (Legacy bait drafts may still store every station as a unit.)
   */
  units: DeviceUnit[];
  /** All units working / good condition? */
  allOperational: boolean | null;
  /** FCU — fly catch / activity since last service */
  catchLevel: FcuCatchLevel;
  /** Bait / monitoring — area-level rodent activity */
  rodentActivity: DeviceUnitActivity;
};

/** One newly opened Red Dot action (location + issue + optional photos) */
export type RedDotAction = {
  id: string;
  location: string;
  issue: string;
  note: string;
  photos: AreaPhoto[];
};

/** Structured Red Dot status — structural / sanitation corrective markers (not pest ID) */
export type RedDotUpdate = {
  /** Previously issued red dots observed on site? */
  previousFound: boolean | null;
  previousCount: string;
  previousLocations: string;
  /**
   * New red dots raised this visit?
   * Yes = structural or sanitation issue requiring corrective action.
   * (newGapsFound kept in sync for older drafts)
   */
  newGapsFound: boolean | null;
  newGapsNote: string;
  dotsPlaced: boolean | null;
  dotsPlacedCount: string;
  dotsPlacedLocations: string;
  /** Per-location new Red Dot actions opened this visit */
  actions: RedDotAction[];
  note: string;
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

/**
 * One subarea within a normal treatment area (e.g. Serving Counter).
 * Captures: done → found → action → recommendation.
 */
export type SubAreaInspection = {
  id: string;
  label: string;
  /** @deprecated unused in capture — kept for draft compat */
  services: string[];
  /** What was found */
  outcome: PointOutcome | null;
  pestType: PestTypeId;
  evidence: EvidenceId;
  thresholdLevel: ThresholdLevel;
  conduciveType: ConduciveType;
  foundNote: string;
  /** What action was taken (chip options) */
  actions: string[];
  /** Free-text action when not covered by chips */
  actionOther: string;
  /** Recommendation chip (catalog) */
  recommendation: string;
  /** Free-text recommendation when not covered by chips */
  recommendationOther: string;
  /** Chemical used when preventive / corrective treatment was applied */
  treatment: TreatmentApplication;
  /** Evidence photos (required when outcome is issue) */
  photos: AreaPhoto[];
  /** Optional photos attached to the recommendation */
  recommendationPhotos: AreaPhoto[];
};

export type AreaInspection = {
  area: string;
  /**
   * Subareas added on the fly (Serving Counter, Couches, …).
   * Primary capture model for normal treatment areas.
   */
  subAreas: SubAreaInspection[];
  /**
   * Legacy Clean-first area-level fields (kept for older drafts).
   * Prefer subAreas for new capture.
   */
  outcome: PointOutcome | null;
  services: string[];
  foci: string[];
  pestType: PestTypeId;
  evidence: EvidenceId;
  thresholdLevel: ThresholdLevel;
  conduciveType: ConduciveType;
  issueNote: string;
  /** Legacy nested points */
  points: InspectionPoint[];
  /** Area-level treatment class — chemical detail lives in treatment.applications */
  treatmentApplied: TreatmentApplied;
  treatment: {
    applications: TreatmentApplication[];
    serviceActions: string[];
  };
  deviceService: DeviceService;
  /** Only meaningful for Red Dot areas */
  redDot: RedDotUpdate | null;
  /** Area-level rollup advice (from subareas when present) */
  recommendation: string;
  notes: string;
  /** Evidence photos for this area (rolled up from subAreas when present) */
  photos: AreaPhoto[];
  /** Derived from photos.length — kept for reports / dashboards */
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

export function emptyDeviceUnit(index = 1): DeviceUnit {
  return {
    id: `unit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    label: "",
    location: "",
    status: "ok",
    services: ["Inspected"],
    activity: null,
    recommendation: "",
    note: "",
    photos: [],
  };
}

function migrateDeviceServices(services: string[]): string[] {
  const out: string[] = [];
  for (const s of services) {
    if (s === "Inspected and serviced") {
      out.push("Inspected", "Serviced");
      continue;
    }
    if (s === "Fitted new glue boards / inserts") {
      out.push("New monitoring trap / glue board fitted");
      continue;
    }
    out.push(s);
  }
  return [...new Set(out.filter(Boolean))];
}

export function emptyRedDotAction(): RedDotAction {
  return {
    id: `rd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    location: "",
    issue: "",
    note: "",
    photos: [],
  };
}

export function emptyRedDotUpdate(): RedDotUpdate {
  return {
    previousFound: null,
    previousCount: "",
    previousLocations: "",
    newGapsFound: null,
    newGapsNote: "",
    dotsPlaced: null,
    dotsPlacedCount: "",
    dotsPlacedLocations: "",
    actions: [],
    note: "",
  };
}

function normalizeAreaPhotos(raw: unknown): AreaPhoto[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const p = item as Record<string, unknown>;
      const dataUrl = typeof p.dataUrl === "string" ? p.dataUrl : "";
      if (!dataUrl.startsWith("data:image/")) return null;
      return {
        id:
          typeof p.id === "string" && p.id
            ? p.id
            : `photo-${index}-${Date.now()}`,
        name: typeof p.name === "string" ? p.name : `Photo ${index + 1}`,
        dataUrl,
        addedAt:
          typeof p.addedAt === "string"
            ? p.addedAt
            : new Date().toISOString(),
      } satisfies AreaPhoto;
    })
    .filter((p): p is AreaPhoto => Boolean(p));
}

function normalizeRedDotAction(raw: unknown, index: number): RedDotAction | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Record<string, unknown>;
  return {
    id:
      typeof a.id === "string" && a.id
        ? a.id
        : `rd-migrated-${index + 1}`,
    location: typeof a.location === "string" ? a.location : "",
    issue: typeof a.issue === "string" ? a.issue : "",
    note: typeof a.note === "string" ? a.note : "",
    photos: normalizeAreaPhotos(a.photos),
  };
}

function syncRedDotLegacyFields(rd: RedDotUpdate): RedDotUpdate {
  const actions = rd.actions ?? [];
  if (rd.dotsPlaced !== true) {
    return {
      ...rd,
      actions: [],
      dotsPlacedCount: "",
      dotsPlacedLocations: "",
      newGapsNote: "",
      newGapsFound: rd.dotsPlaced,
    };
  }
  return {
    ...rd,
    actions,
    dotsPlacedCount: String(actions.length),
    dotsPlacedLocations: actions
      .map((a) => a.location.trim())
      .filter(Boolean)
      .join("; "),
    newGapsNote: actions
      .map((a) => a.issue.trim())
      .filter(Boolean)
      .join("; "),
    newGapsFound: true,
  };
}

export function normalizeRedDotUpdate(raw: unknown): RedDotUpdate | null {
  if (raw === null || raw === undefined) return null;
  if (!raw || typeof raw !== "object") return emptyRedDotUpdate();
  const r = raw as Record<string, unknown>;
  const boolOrNull = (v: unknown): boolean | null =>
    typeof v === "boolean" ? v : null;
  // Prefer dotsPlaced as "new raised"; fall back to newGapsFound from older drafts
  const dotsPlaced =
    boolOrNull(r.dotsPlaced) ?? boolOrNull(r.newGapsFound);

  let actions: RedDotAction[] = [];
  if (Array.isArray(r.actions)) {
    actions = r.actions
      .map((item, i) => normalizeRedDotAction(item, i))
      .filter((a): a is RedDotAction => Boolean(a));
  }

  // Migrate older single-blob drafts into one action card
  if (dotsPlaced === true && actions.length === 0) {
    const location =
      typeof r.dotsPlacedLocations === "string" ? r.dotsPlacedLocations : "";
    const issue = typeof r.newGapsNote === "string" ? r.newGapsNote : "";
    if (location.trim() || issue.trim()) {
      actions = [
        {
          id: "rd-migrated-1",
          location,
          issue,
          note: "",
          photos: [],
        },
      ];
    }
  }

  return syncRedDotLegacyFields({
    previousFound: boolOrNull(r.previousFound),
    previousCount: typeof r.previousCount === "string" ? r.previousCount : "",
    previousLocations:
      typeof r.previousLocations === "string" ? r.previousLocations : "",
    newGapsFound: dotsPlaced,
    newGapsNote: typeof r.newGapsNote === "string" ? r.newGapsNote : "",
    dotsPlaced,
    dotsPlacedCount:
      typeof r.dotsPlacedCount === "string" ? r.dotsPlacedCount : "",
    dotsPlacedLocations:
      typeof r.dotsPlacedLocations === "string" ? r.dotsPlacedLocations : "",
    actions,
    note: typeof r.note === "string" ? r.note : "",
  });
}

export function isRedDotActionComplete(action: RedDotAction): boolean {
  return action.location.trim().length > 0 && action.issue.trim().length > 0;
}

export function isRedDotComplete(redDot: RedDotUpdate | null): boolean {
  if (!redDot) return false;
  if (redDot.previousFound === null || redDot.dotsPlaced === null) return false;
  if (redDot.dotsPlaced === true) {
    const actions = redDot.actions ?? [];
    if (actions.length === 0) return false;
    return actions.every(isRedDotActionComplete);
  }
  return true;
}

export function redDotPhotoRollup(redDot: RedDotUpdate | null): AreaPhoto[] {
  if (!redDot) return [];
  return (redDot.actions ?? []).flatMap((a) => a.photos ?? []);
}

export function emptyDeviceService(): DeviceService {
  return {
    enabled: false,
    count: "",
    actions: [],
    units: [],
    allOperational: null,
    catchLevel: null,
    rodentActivity: null,
  };
}

function rollupDeviceService(device: DeviceService): DeviceService {
  const units = Array.isArray(device.units) ? device.units : [];
  const actionsFromUnits = [
    ...new Set(units.flatMap((u) => u.services).filter(Boolean)),
  ];
  const explicitActions = Array.isArray(device.actions)
    ? device.actions.filter(Boolean)
    : [];
  // Preserve explicit count (including "") — never infer from exception units.
  const count =
    typeof device.count === "string"
      ? device.count
      : units.length > 0
        ? String(units.length)
        : "";
  return {
    enabled: Boolean(device.enabled),
    count,
    actions:
      explicitActions.length > 0 ? explicitActions : actionsFromUnits,
    units,
    allOperational:
      typeof device.allOperational === "boolean"
        ? device.allOperational
        : null,
    catchLevel: device.catchLevel ?? null,
    rodentActivity: device.rodentActivity ?? null,
  };
}

export function normalizeDeviceService(raw: unknown): DeviceService {
  const base = emptyDeviceService();
  if (!raw || typeof raw !== "object") return base;
  const d = raw as Record<string, unknown>;
  const unitsRaw = Array.isArray(d.units) ? d.units : [];
  const validActivity: Exclude<DeviceUnitActivity, null>[] = [
    "none",
    "feeding",
    "droppings",
    "bait_take",
    "other",
  ];
  const validCatch: Exclude<FcuCatchLevel, null>[] = [
    "low",
    "medium",
    "high",
    "light_boards",
  ];
  const catchRaw = d.catchLevel;
  const catchLevel: FcuCatchLevel =
    typeof catchRaw === "string" &&
    validCatch.includes(catchRaw as Exclude<FcuCatchLevel, null>)
      ? (catchRaw as Exclude<FcuCatchLevel, null>)
      : null;
  const allOperational =
    typeof d.allOperational === "boolean" ? d.allOperational : null;
  const rodentRaw = d.rodentActivity;
  const rodentActivity: DeviceUnitActivity =
    rodentRaw === null || rodentRaw === undefined
      ? null
      : typeof rodentRaw === "string" &&
          validActivity.includes(
            rodentRaw as Exclude<DeviceUnitActivity, null>,
          )
        ? (rodentRaw as Exclude<DeviceUnitActivity, null>)
        : null;

  const units: DeviceUnit[] = unitsRaw
    .map((item, i) => {
      if (!item || typeof item !== "object") return null;
      const u = item as Record<string, unknown>;
      const status = (u.status as DeviceUnitStatus) ?? "ok";
      const validStatus: DeviceUnitStatus[] = [
        "ok",
        "dirty",
        "water_damaged",
        "obstructed",
        "missing",
        "needs_paint",
      ];
      const activityRaw = u.activity;
      const activity: DeviceUnitActivity =
        activityRaw === null || activityRaw === undefined
          ? null
          : typeof activityRaw === "string" &&
              validActivity.includes(
                activityRaw as Exclude<DeviceUnitActivity, null>,
              )
            ? (activityRaw as Exclude<DeviceUnitActivity, null>)
            : null;
      return {
        id:
          typeof u.id === "string" && u.id
            ? u.id
            : `unit-${i + 1}`,
        label: typeof u.label === "string" ? u.label : "",
        location: typeof u.location === "string" ? u.location : "",
        status: validStatus.includes(status) ? status : "ok",
        services: migrateDeviceServices(
          Array.isArray(u.services) ? (u.services as string[]) : [],
        ),
        activity,
        recommendation:
          typeof u.recommendation === "string" ? u.recommendation : "",
        note: typeof u.note === "string" ? u.note : "",
        photos: normalizeAreaPhotos(u.photos),
      } satisfies DeviceUnit;
    })
    .filter((u): u is DeviceUnit => Boolean(u));

  return rollupDeviceService({
    enabled: Boolean(d.enabled),
    count: typeof d.count === "string" ? d.count : "",
    actions: migrateDeviceServices(
      Array.isArray(d.actions) ? (d.actions as string[]) : [],
    ),
    units,
    allOperational,
    catchLevel,
    rodentActivity,
  });
}

export function isDeviceUnitComplete(unit: DeviceUnit): boolean {
  return (
    unit.label.trim().length > 0 &&
    unit.services.length > 0 &&
    unit.activity !== null
  );
}

export function deviceUnitPhotoRollup(device: DeviceService | null): AreaPhoto[] {
  if (!device) return [];
  return (device.units ?? []).flatMap((u) => u.photos ?? []);
}

export function baitStationAdviceSuggestion(unit: DeviceUnit): string {
  if (unit.activity !== null && unit.activity !== "none") {
    return "Follow-up monitoring recommended — rodent activity noted at this station";
  }
  if (unit.status !== "ok") {
    return "Client action needed — address station condition or placement issues";
  }
  return "The current rodent management programme remains effective";
}

export function baitRollupAdviceSuggestion(device: DeviceService): string {
  const units = device.units ?? [];
  const exceptionTips = units
    .map((u) => u.recommendation.trim())
    .filter(Boolean);
  if (exceptionTips.length > 0) return exceptionTips.join("; ");
  if (device.rodentActivity && device.rodentActivity !== "none") {
    return "Follow-up monitoring recommended — rodent activity noted at bait / monitoring stations";
  }
  if (device.allOperational === false || units.some((u) => u.status !== "ok")) {
    return "Client action needed — address station condition or placement issues";
  }
  return "The current rodent management programme remains effective";
}

export function isBaitExceptionComplete(unit: DeviceUnit): boolean {
  return (
    unit.label.trim().length > 0 &&
    unit.location.trim().length > 0 &&
    (unit.photos?.length ?? 0) >= 1
  );
}

export function isBaitRollupComplete(device: DeviceService | null): boolean {
  if (!device?.enabled) return false;
  if (!device.count.trim()) return false;
  if (device.actions.length === 0) return false;
  if (device.allOperational === null) return false;
  if (device.rodentActivity === null) return false;
  const units = device.units ?? [];
  if (device.allOperational === false && units.length === 0) return false;
  return units.every(isBaitExceptionComplete);
}

export function fcuAdviceSuggestion(device: DeviceService): string {
  const units = device.units ?? [];
  const obstructed = units.some((u) => u.status === "obstructed");
  if (obstructed) {
    return "Management is advised to ensure monitoring devices remain unobstructed to maintain optimum performance";
  }
  if (device.catchLevel === "high") {
    return "Follow-up monitoring recommended — elevated fly catch noted on FCUs";
  }
  if (device.catchLevel === "medium") {
    return "Continue routine servicing and monitoring as part of the fly management programme";
  }
  if (
    device.allOperational === true &&
    (device.catchLevel === "low" || device.catchLevel === "light_boards")
  ) {
    return "Fly activity remained low, indicating that the current fly management programme is effective";
  }
  if (device.allOperational === false) {
    return "Client action needed — address FCU condition or placement issues";
  }
  return "Continue routine cleaning and servicing of fly control units";
}

export function isFcuExceptionComplete(unit: DeviceUnit): boolean {
  return (
    unit.label.trim().length > 0 &&
    unit.location.trim().length > 0 &&
    (unit.photos?.length ?? 0) >= 1
  );
}

export function isFcuComplete(device: DeviceService | null): boolean {
  if (!device?.enabled) return false;
  if (!device.count.trim()) return false;
  if (device.actions.length === 0) return false;
  if (device.catchLevel === null) return false;
  if (device.allOperational === null) return false;
  const units = device.units ?? [];
  if (device.allOperational === false && units.length === 0) return false;
  return units.every(isFcuExceptionComplete);
}

/** Required FCU fields still empty (all of them) */
export function fcuMissingFields(device: DeviceService | null): string[] {
  if (!device?.enabled) return ["FCU roll-up"];
  const missing: string[] = [];
  if (!device.count.trim()) missing.push("How many FCUs");
  if (device.actions.length === 0) missing.push("Services done");
  if (device.allOperational === null) {
    missing.push("All units working / good condition");
  }
  if (device.catchLevel === null) {
    missing.push("Fly catch since last service");
  }
  const units = device.units ?? [];
  if (device.allOperational === false && units.length === 0) {
    missing.push("At least one exception unit (or mark all units good)");
  }
  units.forEach((u, i) => {
    const n = i + 1;
    if (!u.label.trim()) missing.push(`Exception ${n}: FCU number`);
    if (!u.location.trim()) missing.push(`Exception ${n}: location`);
    if ((u.photos?.length ?? 0) < 1) {
      missing.push(`Exception ${n}: at least one photo`);
    }
  });
  return missing;
}

/** Required bait / station fields still empty (all of them) */
export function baitMissingFields(device: DeviceService | null): string[] {
  if (!device?.enabled) return ["Station roll-up"];
  const missing: string[] = [];
  if (!device.count.trim()) missing.push("How many stations");
  if (device.actions.length === 0) missing.push("Services done");
  if (device.allOperational === null) {
    missing.push("All stations good condition");
  }
  if (device.rodentActivity === null) {
    missing.push("Rodent activity (area overall)");
  }
  const units = device.units ?? [];
  if (device.allOperational === false && units.length === 0) {
    missing.push("At least one exception station (or mark all stations good)");
  }
  units.forEach((u, i) => {
    const n = i + 1;
    if (!u.label.trim()) missing.push(`Exception ${n}: station number`);
    if (!u.location.trim()) missing.push(`Exception ${n}: location`);
    if ((u.photos?.length ?? 0) < 1) {
      missing.push(`Exception ${n}: at least one photo`);
    }
  });
  return missing;
}

/** Required Red Dot fields still empty (all of them) */
export function redDotMissingFields(redDot: RedDotUpdate | null): string[] {
  if (!redDot) return ["Red Dot status"];
  const missing: string[] = [];
  if (redDot.previousFound === null) {
    missing.push("Previous red dots observed");
  }
  if (redDot.dotsPlaced === null) {
    missing.push("New red dots raised");
  }
  if (redDot.dotsPlaced === true) {
    const actions = redDot.actions ?? [];
    if (actions.length === 0) {
      missing.push("At least one new Red Dot action");
    }
    actions.forEach((a, i) => {
      const n = i + 1;
      if (!a.location.trim()) missing.push(`Action ${n}: location`);
      if (!a.issue.trim()) missing.push(`Action ${n}: issue`);
    });
  }
  return missing;
}

export function emptySubArea(label = ""): SubAreaInspection {
  return {
    id: `sub-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    label,
    services: [],
    outcome: null,
    pestType: null,
    evidence: null,
    thresholdLevel: "none",
    conduciveType: null,
    foundNote: "",
    actions: [],
    actionOther: "",
    recommendation: "",
    recommendationOther: "",
    treatment: emptyTreatmentRow(),
    photos: [],
    recommendationPhotos: [],
  };
}

function subAreaHasAction(sub: SubAreaInspection): boolean {
  return sub.actions.length > 0 || sub.actionOther.trim().length > 0;
}

function subAreaHasRecommendation(sub: SubAreaInspection): boolean {
  return (
    sub.recommendation.trim().length > 0 ||
    sub.recommendationOther.trim().length > 0
  );
}

export function subAreaNeedsChemical(sub: SubAreaInspection): boolean {
  return sub.actions.some((a) =>
    /preventive treatment applied|corrective treatment applied/i.test(a),
  );
}

function subAreaTreatmentComplete(sub: SubAreaInspection): boolean {
  if (!subAreaNeedsChemical(sub)) return true;
  const t = sub.treatment;
  return Boolean(t?.product?.trim() && t.method?.trim());
}

export function normalizeSubArea(raw: unknown, index = 0): SubAreaInspection | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const label = typeof r.label === "string" ? r.label : "";
  const outcome =
    r.outcome === "clean" || r.outcome === "issue" ? r.outcome : null;
  return {
    id:
      typeof r.id === "string" && r.id
        ? r.id
        : `sub-${index + 1}`,
    label,
    services: Array.isArray(r.services)
      ? (r.services as string[]).filter(Boolean)
      : [],
    outcome,
    pestType: (r.pestType as PestTypeId) ?? null,
    evidence: (r.evidence as EvidenceId) ?? null,
    thresholdLevel: (r.thresholdLevel as ThresholdLevel) ?? "none",
    conduciveType: (r.conduciveType as ConduciveType) ?? null,
    foundNote: typeof r.foundNote === "string" ? r.foundNote : "",
    actions: Array.isArray(r.actions)
      ? (r.actions as string[]).filter(Boolean)
      : [],
    actionOther: typeof r.actionOther === "string" ? r.actionOther : "",
    recommendation:
      typeof r.recommendation === "string" ? r.recommendation : "",
    recommendationOther:
      typeof r.recommendationOther === "string" ? r.recommendationOther : "",
    treatment: normalizeSubAreaTreatment(r.treatment),
    photos: normalizeAreaPhotos(r.photos),
    recommendationPhotos: normalizeAreaPhotos(r.recommendationPhotos),
  };
}

function normalizeSubAreaTreatment(raw: unknown): TreatmentApplication {
  const base = emptyTreatmentRow();
  if (!raw || typeof raw !== "object") return base;
  const t = raw as Record<string, unknown>;
  return {
    product: typeof t.product === "string" ? t.product : "",
    method: typeof t.method === "string" ? t.method : "",
    activeIngredient:
      typeof t.activeIngredient === "string" ? t.activeIngredient : "",
    antidote: typeof t.antidote === "string" ? t.antidote : "",
    quantity: typeof t.quantity === "string" ? t.quantity : "",
  };
}

export function isSubAreaComplete(sub: SubAreaInspection): boolean {
  if (!sub.label.trim()) return false;
  if (sub.outcome === null) return false;
  if (!subAreaHasAction(sub)) return false;
  if (!subAreaHasRecommendation(sub)) return false;
  if (!subAreaTreatmentComplete(sub)) return false;
  if (sub.outcome === "issue") {
    const hasDetail =
      Boolean(sub.pestType) ||
      Boolean(sub.evidence) ||
      Boolean(sub.conduciveType) ||
      sub.thresholdLevel !== "none" ||
      sub.foundNote.trim().length > 0;
    if (!hasDetail) return false;
    if ((sub.photos?.length ?? 0) < 1) return false;
  }
  return true;
}

export function subAreaAdviceSuggestion(sub: SubAreaInspection): string {
  if (sub.outcome === "issue") {
    if (sub.thresholdLevel === "heavy" || sub.thresholdLevel === "moderate") {
      return "Follow-up visit required";
    }
    if (sub.conduciveType) return "Client action needed";
    return "Continue routine monitoring";
  }
  if (sub.outcome === "clean") {
    return "Maintain high hygiene standards";
  }
  return "";
}

/** Required subarea fields still empty (all of them) */
export function standardAreaMissingFields(insp: AreaInspection): string[] {
  const missing: string[] = [];
  const subs = insp.subAreas ?? [];

  if (subs.length === 0) {
    return ["Add at least one subarea"];
  }

  subs.forEach((sub, i) => {
    const n = i + 1;
    const name = sub.label.trim() || `Subarea ${n}`;
    if (!sub.label.trim()) missing.push(`${name}: name`);
    if (sub.outcome === null) missing.push(`${name}: what was found`);
    if (!subAreaHasAction(sub)) missing.push(`${name}: action taken`);
    if (!subAreaHasRecommendation(sub)) {
      missing.push(`${name}: recommendation`);
    }
    if (subAreaNeedsChemical(sub) && !subAreaTreatmentComplete(sub)) {
      const t = sub.treatment;
      if (!t.product.trim()) missing.push(`${name}: chemical product`);
      if (!t.method.trim()) missing.push(`${name}: chemical method`);
    }
    if (sub.outcome === "issue") {
      const hasDetail =
        Boolean(sub.pestType) ||
        Boolean(sub.evidence) ||
        Boolean(sub.conduciveType) ||
        sub.thresholdLevel !== "none" ||
        sub.foundNote.trim().length > 0;
      if (!hasDetail) missing.push(`${name}: finding detail`);
      if ((sub.photos?.length ?? 0) < 1) {
        missing.push(`${name}: at least one photo`);
      }
    }
  });

  return missing;
}

export function isStandardAreaComplete(insp: AreaInspection): boolean {
  return standardAreaMissingFields(insp).length === 0;
}

/** @deprecated use subAreaAdviceSuggestion */
export function standardAreaAdviceSuggestion(insp: AreaInspection): string {
  const subs = insp.subAreas ?? [];
  if (subs.some((s) => s.outcome === "issue")) {
    return "Follow-up visit required";
  }
  if (insp.outcome === "issue") {
    if (insp.thresholdLevel === "heavy" || insp.thresholdLevel === "moderate") {
      return "Follow-up visit required";
    }
    if (insp.conduciveType) return "Client action needed";
    return "Continue routine monitoring";
  }
  if (insp.outcome === "clean" || subs.some((s) => s.outcome === "clean")) {
    return "Maintain high hygiene standards";
  }
  return "";
}

/** Required fields still empty for any area type (all of them) */
export function areaMissingFields(insp: AreaInspection): string[] {
  const a = normalizeAreaInspection(insp, insp.area);

  if (isRedDotArea(a.area)) return redDotMissingFields(a.redDot);
  if (isRodentBaitArea(a.area)) return baitMissingFields(a.deviceService);
  if (isFcuArea(a.area)) return fcuMissingFields(a.deviceService);

  return standardAreaMissingFields(a);
}

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

/** PMP-added subsection inside an area (e.g. Lobby → Couches, waste bins). */
export function createCustomInspectionPoint(label: string): InspectionPoint {
  const trimmed = label.trim().replace(/\s+/g, " ");
  const id = `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const lower = trimmed.toLowerCase() || "section";
  return emptyInspectionPoint(
    id,
    trimmed || "Section",
    `${trimmed || "This section"} was inspected and found clean and well maintained.`,
    `Issue activity was recorded at the ${lower}, associated with {conducive_condition}. {action_tier} response applied.`,
  );
}

export function isCustomPoint(pointId: string): boolean {
  return pointId.startsWith("custom-");
}

export function emptyPointsForArea(area: string): InspectionPoint[] {
  return getPointTemplates(area).map((t) =>
    emptyInspectionPoint(t.pointId, t.label, t.phraseClean, t.phraseIssue),
  );
}

export function emptyAreaInspection(area = ""): AreaInspection {
  const isBait = area ? isRodentBaitArea(area) : false;
  const isFcu = area ? isFcuArea(area) : false;
  const isRed = area ? isRedDotArea(area) : false;
  return {
    area,
    subAreas: [],
    outcome: null,
    services: [],
    foci: [],
    pestType: null,
    evidence: null,
    thresholdLevel: "none",
    conduciveType: null,
    issueNote: "",
    points: [],
    treatmentApplied: "none",
    treatment: { applications: [], serviceActions: [] },
    deviceService: isBait
      ? normalizeDeviceService({
          enabled: true,
          count: "",
          actions: [],
          units: [],
          allOperational: null,
          catchLevel: null,
          rodentActivity: null,
        })
      : isFcu
        ? normalizeDeviceService({
            enabled: true,
            count: "",
            actions: [],
            units: [],
            allOperational: null,
            catchLevel: null,
            rodentActivity: null,
          })
        : emptyDeviceService(),
    redDot: isRed ? emptyRedDotUpdate() : null,
    recommendation: "",
    notes: "",
    photos: [],
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
  const subs = area.subAreas ?? [];
  const subApps = subs
    .map((s) => s.treatment)
    .filter((t) => t?.product?.trim());
  const existingApps = normalizeTreatment(area.treatment).applications.filter(
    (a) => a.product.trim(),
  );
  // Prefer live subarea chemicals when present
  const apps = subApps.length > 0 ? subApps : existingApps;
  let treatmentApplied = area.treatmentApplied;
  if (apps.length > 0 && treatmentApplied === "none") {
    treatmentApplied = subs.some((s) =>
      s.actions.some((a) => /corrective treatment applied/i.test(a)),
    )
      ? "corrective"
      : "preventive";
  } else if (
    apps.length === 0 &&
    subs.some((s) =>
      s.actions.some((a) =>
        /preventive treatment applied|corrective treatment applied/i.test(a),
      ),
    )
  ) {
    treatmentApplied = subs.some((s) =>
      s.actions.some((a) => /corrective treatment applied/i.test(a)),
    )
      ? "corrective"
      : "preventive";
  }

  let recommendation = area.recommendation.trim();
  if (isRodentBaitArea(area.area)) {
    recommendation = baitRollupAdviceSuggestion(area.deviceService);
  } else if (isFcuArea(area.area)) {
    if (!recommendation) {
      recommendation = fcuAdviceSuggestion(area.deviceService);
    }
  } else if (subs.length > 0) {
    const tips = [
      ...new Set(
        subs
          .flatMap((s) => [s.recommendation.trim(), s.recommendationOther.trim()])
          .filter(Boolean),
      ),
    ];
    if (tips.length > 0) recommendation = tips.join("; ");
  } else if (
    !recommendation &&
    roll.status !== null &&
    area.outcome === null &&
    area.points.some((p) => p.outcome !== null)
  ) {
    recommendation = suggestRecommendation(
      roll.overallThreshold,
      roll.overallActionTier,
    );
  }

  const advice = recommendation ? [recommendation] : [];
  const subPhotos = subs.flatMap((s) => [
    ...(s.photos ?? []),
    ...(s.recommendationPhotos ?? []),
  ]);
  const rolledPhotos =
    isRedDotArea(area.area) && area.redDot
      ? redDotPhotoRollup(area.redDot)
      : isRodentBaitArea(area.area) || isFcuArea(area.area)
        ? deviceUnitPhotoRollup(area.deviceService)
        : subPhotos.length > 0
          ? subPhotos
          : Array.isArray(area.photos)
            ? area.photos
            : [];

  const isSpecial =
    isRedDotArea(area.area) ||
    isRodentBaitArea(area.area) ||
    isFcuArea(area.area);

  let status: AreaStatus | null = roll.status;
  let findings = roll.findings;
  let pestTypes = roll.pestTypes;
  let outcome = area.outcome;

  if (!isSpecial && subs.length > 0) {
    const started = subs.filter((s) => s.outcome !== null);
    if (started.length > 0) {
      const hasIssue = started.some((s) => s.outcome === "issue");
      status = hasIssue ? "issues" : "clean";
      outcome = hasIssue ? "issue" : "clean";
      findings = [
        ...new Set(
          started
            .filter((s) => s.conduciveType)
            .map((s) => conduciveLabel(s.conduciveType))
            .filter(Boolean),
        ),
      ];
      pestTypes = [
        ...new Set(
          started
            .filter((s) => s.pestType)
            .map((s) => pestTypeLabel(s.pestType))
            .filter(Boolean),
        ),
      ];
    }
  } else if (!isSpecial && area.outcome !== null) {
    status = area.outcome === "issue" ? "issues" : "clean";
    findings = area.conduciveType
      ? [conduciveLabel(area.conduciveType)].filter(Boolean)
      : [];
    pestTypes = area.pestType
      ? [pestTypeLabel(area.pestType)].filter(Boolean)
      : [];
  }

  return {
    ...area,
    subAreas: subs,
    outcome,
    photos: rolledPhotos,
    photoCount: rolledPhotos.length,
    treatmentApplied,
    treatment: {
      ...normalizeTreatment(area.treatment),
      applications: apps,
    },
    recommendation,
    advice,
    status,
    findings,
    pestTypes,
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
  let device = normalizeDeviceService(r.deviceService);
  if (isRodentBaitArea(area)) {
    if (!device.enabled) {
      device = normalizeDeviceService({
        ...device,
        enabled: true,
      });
    }
  } else if (isFcuArea(area) && !device.enabled) {
    device = normalizeDeviceService({
      ...device,
      enabled: true,
    });
  }
  const redDotRaw = "redDot" in r ? r.redDot : null;
  const redDot = isRedDotArea(area)
    ? normalizeRedDotUpdate(redDotRaw) ?? emptyRedDotUpdate()
    : normalizeRedDotUpdate(redDotRaw);

  const templates = emptyPointsForArea(area);
  let points: InspectionPoint[];

  if (Array.isArray(r.points) && r.points.length > 0) {
    const byId = new Map(
      (r.points as unknown[]).map((p) => {
        const n = normalizePoint(p, templates[0] ?? emptyInspectionPoint("x", area));
        return [n.pointId, n] as const;
      }),
    );
    // Prefer stored points as-is (including custom); fill template gaps only for legacy
    points = [...byId.values()];
    for (const t of templates) {
      if (!points.some((x) => x.pointId === t.pointId)) {
        const match = (r.points as unknown[]).find(
          (p) =>
            p &&
            typeof p === "object" &&
            ((p as { label?: string }).label === t.label),
        );
        if (match) {
          points.push(
            normalizePoint(
              match,
              emptyInspectionPoint(
                t.pointId,
                t.label,
                t.phraseClean,
                t.phraseIssue,
              ),
            ),
          );
        }
      }
    }
  } else if (
    Array.isArray(r.points) &&
    r.points.length === 0 &&
    !("housekeeping" in r) &&
    !("itemsFound" in r)
  ) {
    // Clean-first drafts deliberately store no subsection points
    points = [];
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

  const servicesRaw = Array.isArray(r.services)
    ? (r.services as string[]).filter(Boolean)
    : Array.isArray(treatment.serviceActions) && treatment.serviceActions.length
      ? treatment.serviceActions
      : [];
  const foci = Array.isArray(r.foci)
    ? (r.foci as string[]).filter(Boolean)
    : [];

  let outcome: PointOutcome | null =
    r.outcome === "clean" || r.outcome === "issue"
      ? r.outcome
      : null;
  if (
    outcome === null &&
    !isRedDotArea(area) &&
    !isRodentBaitArea(area) &&
    !isFcuArea(area)
  ) {
    if (points.some((p) => p.outcome === "issue")) outcome = "issue";
    else if (
      points.length > 0 &&
      points.every((p) => p.outcome === "clean")
    ) {
      outcome = "clean";
    } else if (r.status === "clean") outcome = "clean";
    else if (r.status === "issues") outcome = "issue";
  }

  const issuePoint = points.find((p) => p.outcome === "issue");
  const pestType: PestTypeId =
    r.pestType === undefined || r.pestType === null
      ? (issuePoint?.identification.pestType ?? null)
      : (r.pestType as PestTypeId);
  const evidence: EvidenceId =
    r.evidence === undefined || r.evidence === null
      ? (issuePoint?.identification.evidence ?? null)
      : (r.evidence as EvidenceId);
  const thresholdLevel: ThresholdLevel =
    typeof r.thresholdLevel === "string"
      ? (r.thresholdLevel as ThresholdLevel)
      : (issuePoint?.thresholdLevel ?? "none");
  const conduciveType: ConduciveType =
    r.conduciveType === undefined
      ? issuePoint?.conduciveCondition.present
        ? issuePoint.conduciveCondition.type
        : null
      : (r.conduciveType as ConduciveType);
  const issueNote =
    typeof r.issueNote === "string"
      ? r.issueNote
      : issuePoint?.note ?? "";

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

  const photos = normalizeAreaPhotos(r.photos);
  const photoCount =
    photos.length > 0
      ? photos.length
      : typeof r.photoCount === "number"
        ? r.photoCount
        : 0;

  let subAreas: SubAreaInspection[] = [];
  if (Array.isArray(r.subAreas) && r.subAreas.length > 0) {
    subAreas = r.subAreas
      .map((item, i) => normalizeSubArea(item, i))
      .filter((s): s is SubAreaInspection => Boolean(s));
  } else if (
    !isRedDotArea(area) &&
    !isRodentBaitArea(area) &&
    !isFcuArea(area)
  ) {
    // Migrate completed points → subareas
    const startedPoints = points.filter((p) => p.outcome !== null);
    if (startedPoints.length > 0) {
      subAreas = startedPoints.map((p, i) => ({
        ...emptySubArea(p.label),
        id: `migrated-${p.pointId || i}`,
        services: servicesRaw.length > 0 ? servicesRaw : ["Inspected"],
        outcome: p.outcome,
        pestType: p.identification.pestType,
        evidence: p.identification.evidence,
        thresholdLevel: p.thresholdLevel,
        conduciveType: p.conduciveCondition.present
          ? p.conduciveCondition.type
          : null,
        foundNote: p.note,
        actions:
          p.outcome === "clean"
            ? ["No action required"]
            : ["Monitoring continued"],
        recommendation: recommendation || subAreaAdviceSuggestion({
          ...emptySubArea(p.label),
          outcome: p.outcome,
          conduciveType: p.conduciveCondition.present
            ? p.conduciveCondition.type
            : null,
          thresholdLevel: p.thresholdLevel,
        }),
        photos: [],
      }));
    } else if (outcome !== null) {
      // Migrate legacy area-level Clean-first → one subarea
      subAreas = [
        {
          ...emptySubArea(area || "Primary"),
          id: "migrated-primary",
          services: servicesRaw.length > 0 ? servicesRaw : ["Inspected"],
          outcome,
          pestType,
          evidence,
          thresholdLevel,
          conduciveType,
          foundNote: issueNote,
          actions:
            outcome === "clean"
              ? ["No action required"]
              : ["Monitoring continued"],
          recommendation:
            recommendation ||
            subAreaAdviceSuggestion({
              ...emptySubArea(area),
              outcome,
              conduciveType,
              thresholdLevel,
            }),
          photos,
        },
      ];
    }
  }

  return syncAreaDerivedFields({
    area,
    subAreas,
    outcome,
    services: servicesRaw,
    foci,
    pestType,
    evidence,
    thresholdLevel,
    conduciveType,
    issueNote,
    points,
    treatmentApplied,
    treatment: {
      ...treatment,
      serviceActions:
        servicesRaw.length > 0 ? servicesRaw : treatment.serviceActions,
    },
    deviceService: device,
    redDot,
    recommendation,
    notes:
      typeof r.notes === "string"
        ? r.notes
        : typeof (r.observations as { notes?: string })?.notes === "string"
          ? (r.observations as { notes: string }).notes
          : "",
    photos,
    photoCount,
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

/** FCU / non-toxic / toxic bait — supports per-unit logging */
export function isMonitoringDeviceArea(area: string): boolean {
  const a = area.toLowerCase();
  return /fly control|fcu|non-?toxic|monitoring (device|station)|toxic bait|bait station|rodent bait|rodent monitor/.test(
    a,
  );
}

export function isRedDotArea(area: string): boolean {
  return /red\s*dot/i.test(area);
}

/** Fly Control Units */
export function isFcuArea(area: string): boolean {
  return /fly control|fcu/i.test(area);
}

/** Toxic / non-toxic rodent bait & monitoring stations */
export function isRodentBaitArea(area: string): boolean {
  const a = area.toLowerCase();
  if (/fly control|fcu/.test(a)) return false;
  return /non-?toxic|toxic bait|rodent bait|bait station|rodent monitor|monitoring station/.test(
    a,
  );
}

/** Normalize solo/team fields before save or display */
export function normalizeJobAssignment(visit: ScheduledVisit): ScheduledVisit {
  const mode: AssignmentMode = visit.assignmentMode === "team" ? "team" : "solo";
  const leadId = visit.technicianId?.trim() || undefined;
  let memberIds = [...(visit.teamMemberIds ?? [])].filter(Boolean);

  if (mode === "solo") {
    memberIds = leadId ? [leadId] : [];
  } else if (leadId && !memberIds.includes(leadId)) {
    memberIds = [leadId, ...memberIds];
  }

  return {
    ...visit,
    assignmentMode: mode,
    technicianId: leadId,
    teamMemberIds: memberIds,
  };
}

export function jobCoveragePercent(areas: AreaInspection[]): number {
  if (!areas.length) return 0;
  const done = areas.filter(isAreaComplete).length;
  return Math.round((done / areas.length) * 100);
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

  // Red Dot is a structural/sanitation status pass — not pest-point capture
  if (isRedDotArea(a.area)) {
    return isRedDotComplete(a.redDot);
  }

  // Rodent bait / monitoring — roll-up + optional exception cards
  if (isRodentBaitArea(a.area)) {
    return isBaitRollupComplete(a.deviceService);
  }

  // FCU — roll-up + optional exception cards
  if (isFcuArea(a.area)) {
    return isFcuComplete(a.deviceService);
  }

  // Normal treatment areas — Clean-first area-level capture
  return isStandardAreaComplete(a);
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
