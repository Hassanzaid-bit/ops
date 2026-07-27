import type { VisitType } from "./types";

/** Chip vocabulary aligned to real IPM Service Report language */
export const PEST_TYPE_GROUPS: { label: string; options: string[] }[] = [
  {
    label: "Cockroach",
    options: ["German cockroach", "American cockroach"],
  },
  {
    label: "Flying insects",
    options: [
      "Flying insects (unspecified)",
      "House fly",
      "Fruit fly",
      "Drain fly",
    ],
  },
  {
    label: "Rodent",
    options: ["Rat", "Mouse", "Rodent (unspecified)"],
  },
  {
    label: "Other",
    options: ["Ant", "Stored product pest", "None observed"],
  },
];

/** Flat list for selects / CSV — order follows groups */
export const PEST_TYPES = PEST_TYPE_GROUPS.flatMap((g) => g.options);

export const EVIDENCE_TYPES = [
  "None observed",
  "Low activity",
  "Live sighting",
  "Droppings",
  "Structural gaps",
  "Glue board catch",
  "Bait take",
  "Damage",
];

/** Chemical / bait products — Product | Method | Active | Antidote | Qty */
export type TreatmentCatalogItem = {
  product: string;
  method: string;
  activeIngredient: string;
  antidote: string;
  defaultQuantity: string;
};

export const TREATMENT_CATALOG: TreatmentCatalogItem[] = [
  {
    product: "Fendona",
    method: "Spraying",
    activeIngredient: "ALPHA-CYPERMETHRIN",
    antidote: "N/A",
    defaultQuantity: "25 ml",
  },
  {
    product: "Goliath",
    method: "Gelling using gel gun",
    activeIngredient: "Fipronil",
    antidote: "None",
    defaultQuantity: "5 gr",
  },
  {
    product: "Tomcat",
    method: "Baiting",
    activeIngredient: "Bromodiolene",
    antidote: "Activated charcoal",
    defaultQuantity: "80 gr",
  },
];

export const TREATMENT_PRODUCT_NAMES = TREATMENT_CATALOG.map((t) => t.product);

/** Methods technicians select when applying a product */
export const TREATMENT_APPLICATION_METHODS = [
  ...new Set(TREATMENT_CATALOG.map((t) => t.method)),
];

/** Quantity options technicians select */
export const TREATMENT_QUANTITIES = [
  "25 ml",
  "50 ml",
  "5 gr",
  "10 gr",
  "60 gr",
  "80 gr",
  "100 gr",
];

export function getTreatmentCatalogItem(
  product: string,
): TreatmentCatalogItem | undefined {
  return TREATMENT_CATALOG.find(
    (t) => t.product.toLowerCase() === product.toLowerCase(),
  );
}

/** Format one applied treatment for reports / Insectram */
export function formatTreatmentLine(app: {
  product: string;
  method: string;
  activeIngredient: string;
  antidote: string;
  quantity: string;
}): string {
  return [
    `Product: ${app.product}`,
    `Method: ${app.method}`,
    `Active ingredient: ${app.activeIngredient}`,
    `Antidote: ${app.antidote}`,
    `Qty: ${app.quantity}`,
  ].join(" | ");
}

/** Non-chemical service actions (monitoring, FCU, etc.) */
export const SERVICE_ACTIONS = [
  "Inspected only",
  "Preventive treatment applied",
  "Cleaned and serviced",
  "FCU glue boards replaced",
  "Monitoring inserts replaced",
  "Bait stations replenished",
  "Grease trap cleaned & treated",
  "Rodent monitors serviced",
  "No treatment required",
];

/** @deprecated use SERVICE_ACTIONS */
export const TREATMENT_METHODS = SERVICE_ACTIONS;

export const FINDINGS = [
  "Food debris / residues",
  "Spillages",
  "Grease accumulation",
  "Clutter / harbourage",
  "Gaps, cracks or openings",
  "Drainage / sanitation concern",
  "Damaged packaging",
  "Stock on floor",
];

export const ADVICE_OPTIONS = [
  "Continue routine monitoring",
  "Maintain high hygiene standards",
  "Staff advised to clean spillages promptly",
  "Routine cleaning / servicing recommended",
  "Follow-up visit required",
  "Client action needed",
];

export const DEVICE_ACTIONS = [
  "Inspected and serviced",
  "Cleaned",
  "Fitted new glue boards / inserts",
  "Replenished bait",
  "Rearmed for monitoring",
];

export const DEVICE_COUNTS = ["1", "2", "3", "4", "5", "6", "8", "10"];

export const RECOMMENDATIONS = ADVICE_OPTIONS;

export const VISIT_TYPE_LABELS: Record<VisitType, string> = {
  full_inspection: "Full Inspection",
  follow_up: "Follow-up",
};
