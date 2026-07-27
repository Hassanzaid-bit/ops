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

export type AreaInspection = {
  area: string;
  /** Clean vs issues — primary status tap */
  status: AreaStatus | null;
  findings: string[];
  pestTypes: string[];
  treatment: {
    applications: TreatmentApplication[];
    serviceActions: string[];
  };
  deviceService: DeviceService;
  advice: string[];
  notes: string;
  photoCount: number;
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

export function emptyAreaInspection(area = ""): AreaInspection {
  return {
    area,
    status: null,
    findings: [],
    pestTypes: [],
    treatment: { applications: [], serviceActions: [] },
    deviceService: { enabled: false, count: "", actions: [] },
    advice: [],
    notes: "",
    photoCount: 0,
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

/** Migrate legacy drafts / seed records into the new area shape */
export function normalizeAreaInspection(raw: unknown, areaName = ""): AreaInspection {
  const base = emptyAreaInspection(areaName);
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;

  if ("status" in r || "findings" in r || "advice" in r) {
    const treatment = normalizeTreatment(
      r.treatment as AreaInspection["treatment"],
    );
    const device = (r.deviceService as DeviceService | undefined) ?? base.deviceService;
    return {
      area: typeof r.area === "string" ? r.area : areaName,
      status: (r.status as AreaStatus | null) ?? null,
      findings: Array.isArray(r.findings) ? (r.findings as string[]) : [],
      pestTypes: Array.isArray(r.pestTypes)
        ? (r.pestTypes as string[])
        : Array.isArray((r.itemsFound as { pestTypes?: string[] })?.pestTypes)
          ? ((r.itemsFound as { pestTypes: string[] }).pestTypes)
          : [],
      treatment,
      deviceService: {
        enabled: Boolean(device.enabled),
        count: device.count ?? "",
        actions: Array.isArray(device.actions) ? device.actions : [],
      },
      advice: Array.isArray(r.advice)
        ? (r.advice as string[])
        : Array.isArray(r.recommendation)
          ? (r.recommendation as string[])
          : [],
      notes:
        typeof r.notes === "string"
          ? r.notes
          : typeof (r.observations as { notes?: string })?.notes === "string"
            ? (r.observations as { notes: string }).notes
            : "",
      photoCount: typeof r.photoCount === "number" ? r.photoCount : 0,
    };
  }

  // Legacy shape
  const hk = r.housekeeping as
    | { rating?: string | null; conditions?: string[] }
    | undefined;
  const items = r.itemsFound as
    | { pestTypes?: string[]; evidence?: string[] }
    | undefined;
  const obs = r.observations as
    | { severity?: string | null; notes?: string }
    | undefined;
  const rating = hk?.rating;
  const conditions = (hk?.conditions ?? []).filter((c) => c !== "None observed");
  const status: AreaStatus | null =
    rating === "poor" || rating === "fair" || conditions.length > 0
      ? "issues"
      : rating === "good"
        ? "clean"
        : null;

  return {
    area: typeof r.area === "string" ? r.area : areaName,
    status,
    findings: conditions,
    pestTypes: (items?.pestTypes ?? []).filter((p) => p !== "None observed"),
    treatment: normalizeTreatment(r.treatment as AreaInspection["treatment"]),
    deviceService: base.deviceService,
    advice: Array.isArray(r.recommendation) ? (r.recommendation as string[]) : [],
    notes: obs?.notes ?? "",
    photoCount: typeof r.photoCount === "number" ? r.photoCount : 0,
  };
}

export function isDeviceArea(area: string): boolean {
  const a = area.toLowerCase();
  return /fly control|fcu|bait|monitoring|rodent|manhole|drain/.test(a);
}

/** Area is complete enough to count toward visit progress */
export function isAreaComplete(insp: AreaInspection): boolean {
  if (!insp.status) return false;
  if (insp.status === "issues" && insp.findings.length === 0 && insp.pestTypes.length === 0) {
    return false;
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

export function allAreasComplete(areas: AreaInspection[]): boolean {
  return areas.length > 0 && areas.every(isAreaComplete);
}
