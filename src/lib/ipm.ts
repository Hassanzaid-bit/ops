/**
 * IPM schema v2 vocab — mapped from prior FINDINGS / PEST_TYPES / ADVICE chips.
 */

export type PestTypeId =
  | "cockroach_german"
  | "cockroach_american"
  | "rodent"
  | "fly"
  | "ant"
  | "other"
  | null;

export type EvidenceId =
  | "live_activity"
  | "droppings"
  | "damage"
  | "nesting"
  | "egg_cases"
  | "glue_board"
  | "bait_take"
  | null;

export type ThresholdLevel = "none" | "light" | "moderate" | "heavy";

export type ConduciveType =
  | "moisture"
  | "food_debris"
  | "clutter"
  | "structural_gap"
  | "not_sealed"
  | "dirty"
  | "oil_accumulation"
  | "obstruction"
  | "water_damage"
  | "paint_wear"
  | null;

export type ActionTier =
  | "monitor"
  | "exclusion_sanitation"
  | "targeted_treatment"
  | "escalation";

export type TreatmentApplied = "preventive" | "corrective" | "none";

export type PointOutcome = "clean" | "issue";

export const PEST_TYPE_OPTIONS: {
  id: Exclude<PestTypeId, null>;
  label: string;
}[] = [
  { id: "cockroach_german", label: "German cockroach" },
  { id: "cockroach_american", label: "American cockroach" },
  { id: "rodent", label: "Rodent" },
  { id: "fly", label: "Flying insects" },
  { id: "ant", label: "Ant" },
  { id: "other", label: "Other" },
];

export const EVIDENCE_OPTIONS: {
  id: Exclude<EvidenceId, null>;
  label: string;
}[] = [
  { id: "live_activity", label: "Live activity / sighting" },
  { id: "droppings", label: "Droppings" },
  { id: "damage", label: "Damage" },
  { id: "nesting", label: "Nesting" },
  { id: "egg_cases", label: "Egg cases" },
  { id: "glue_board", label: "Glue board catch" },
  { id: "bait_take", label: "Bait take" },
];

export const THRESHOLD_OPTIONS: { id: ThresholdLevel; label: string }[] = [
  { id: "none", label: "None" },
  { id: "light", label: "Light" },
  { id: "moderate", label: "Moderate" },
  { id: "heavy", label: "Heavy" },
];

/** Mapped from former FINDINGS chips */
export const CONDUCIVE_OPTIONS: {
  id: Exclude<ConduciveType, null>;
  label: string;
  legacyFindings: string[];
}[] = [
  {
    id: "food_debris",
    label: "Food debris / residues",
    legacyFindings: ["Food debris / residues", "Spillages", "Grease accumulation"],
  },
  {
    id: "moisture",
    label: "Moisture / drainage",
    legacyFindings: ["Drainage / sanitation concern"],
  },
  {
    id: "clutter",
    label: "Clutter / harbourage",
    legacyFindings: ["Clutter / harbourage", "Stock on floor", "Damaged packaging"],
  },
  {
    id: "structural_gap",
    label: "Gaps, cracks or openings",
    legacyFindings: ["Gaps, cracks or openings"],
  },
  {
    id: "not_sealed",
    label: "Not sealed / open fitting",
    legacyFindings: [],
  },
  {
    id: "dirty",
    label: "Dirty / sanitation gap",
    legacyFindings: [],
  },
  {
    id: "oil_accumulation",
    label: "Oil accumulation",
    legacyFindings: ["Grease accumulation"],
  },
  {
    id: "obstruction",
    label: "Obstruction / blocked access",
    legacyFindings: [],
  },
  {
    id: "water_damage",
    label: "Water damage",
    legacyFindings: [],
  },
  {
    id: "paint_wear",
    label: "Deteriorating paint / corrosion",
    legacyFindings: [],
  },
];

export const ACTION_TIER_OPTIONS: { id: ActionTier; label: string }[] = [
  { id: "monitor", label: "Monitor only" },
  { id: "exclusion_sanitation", label: "Exclusion / sanitation fix" },
  { id: "targeted_treatment", label: "Targeted treatment" },
  { id: "escalation", label: "Escalation" },
];

export const TREATMENT_APPLIED_OPTIONS: {
  id: TreatmentApplied;
  label: string;
}[] = [
  { id: "none", label: "None" },
  { id: "preventive", label: "Preventive" },
  { id: "corrective", label: "Corrective" },
];

export function pestTypeLabel(id: PestTypeId): string {
  if (!id) return "";
  return PEST_TYPE_OPTIONS.find((p) => p.id === id)?.label ?? id;
}

export function evidenceLabel(id: EvidenceId): string {
  if (!id) return "";
  return EVIDENCE_OPTIONS.find((e) => e.id === id)?.label ?? id;
}

export function conduciveLabel(id: ConduciveType): string {
  if (!id) return "";
  return CONDUCIVE_OPTIONS.find((c) => c.id === id)?.label ?? id;
}

export function actionTierLabel(id: ActionTier): string {
  return ACTION_TIER_OPTIONS.find((a) => a.id === id)?.label ?? id;
}

/** Map legacy pest chip → pest type id */
export function mapLegacyPest(label: string): PestTypeId {
  const t = label.toLowerCase();
  if (t.includes("german")) return "cockroach_german";
  if (t.includes("american") && t.includes("cockroach"))
    return "cockroach_american";
  if (t.includes("cockroach")) return "cockroach_german";
  if (t.includes("rat") || t.includes("mouse") || t.includes("rodent"))
    return "rodent";
  if (t.includes("fly") || t.includes("flying")) return "fly";
  if (t.includes("ant")) return "ant";
  if (t.includes("none")) return null;
  return "other";
}

/** Map legacy finding chip → conducive type */
export function mapLegacyFinding(label: string): ConduciveType {
  for (const opt of CONDUCIVE_OPTIONS) {
    if (opt.legacyFindings.includes(label)) return opt.id;
  }
  const t = label.toLowerCase();
  if (t.includes("food") || t.includes("spillage") || t.includes("grease"))
    return "food_debris";
  if (t.includes("drain") || t.includes("moisture")) return "moisture";
  if (t.includes("clutter") || t.includes("stock") || t.includes("packag"))
    return "clutter";
  if (t.includes("gap") || t.includes("crack") || t.includes("open"))
    return "structural_gap";
  return "dirty";
}

export function mapLegacyEvidence(label: string): EvidenceId {
  const t = label.toLowerCase();
  if (t.includes("live") || t.includes("sighting") || t.includes("activity"))
    return "live_activity";
  if (t.includes("dropping")) return "droppings";
  if (t.includes("damage")) return "damage";
  if (t.includes("nest")) return "nesting";
  if (t.includes("egg")) return "egg_cases";
  if (t.includes("glue")) return "glue_board";
  if (t.includes("bait")) return "bait_take";
  return null;
}

/**
 * Auto-suggest recommendation from highest threshold + strongest action tier
 * among issue points (schema v2 rule table).
 */
export function suggestRecommendation(
  threshold: ThresholdLevel,
  actionTier: ActionTier,
): string {
  if (threshold === "none" && actionTier === "monitor") {
    return "Continue routine monitoring";
  }
  if (threshold === "light" && actionTier === "monitor") {
    return "Continue monitoring; no treatment needed yet";
  }
  if (threshold === "light" && actionTier === "targeted_treatment") {
    return "Monitor closely following treatment to confirm resolution";
  }
  if (threshold === "moderate" && actionTier === "targeted_treatment") {
    return "Follow-up visit required";
  }
  if (threshold === "heavy") {
    return "Follow-up visit required";
  }
  if (actionTier === "escalation") {
    return "Follow-up visit required";
  }
  if (actionTier === "exclusion_sanitation") {
    return "Client action needed";
  }
  if (actionTier === "targeted_treatment") {
    return "Monitor closely following treatment to confirm resolution";
  }
  return "Continue routine monitoring";
}

const THRESHOLD_RANK: Record<ThresholdLevel, number> = {
  none: 0,
  light: 1,
  moderate: 2,
  heavy: 3,
};

const ACTION_RANK: Record<ActionTier, number> = {
  monitor: 0,
  exclusion_sanitation: 1,
  targeted_treatment: 2,
  escalation: 3,
};

export function rollupThreshold(
  levels: ThresholdLevel[],
): ThresholdLevel {
  let best: ThresholdLevel = "none";
  for (const l of levels) {
    if (THRESHOLD_RANK[l] > THRESHOLD_RANK[best]) best = l;
  }
  return best;
}

export function rollupActionTier(tiers: ActionTier[]): ActionTier {
  let best: ActionTier = "monitor";
  for (const t of tiers) {
    if (ACTION_RANK[t] > ACTION_RANK[best]) best = t;
  }
  return best;
}
