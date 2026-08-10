import { buildChecklistAreas, type ChecklistArea } from "./site-checklist";

/**
 * Standard KFC IPM checklist (Uganda reports, Jul 2026).
 * Copied per branch on import — each site keeps its own editable copy.
 *
 * “Departments” in Insectram (for monitoring stations) are a separate future layer.
 */
export const KFC_CHECKLIST_SPEC: { name: string; subAreas?: string[] }[] = [
  {
    name: "Front of house",
    subAreas: [
      "Lobby area",
      "Serving counter",
      "Customer seating",
      "Office area",
      "Cash box & safe",
      "Crusher & ice cream machine",
      "Soda fridge",
      "Air curtain (FOH)",
      "Washrooms",
      "Paper towels & soap dispensers",
    ],
  },
  {
    name: "Back of house",
    subAreas: [
      "Cooking area",
      "Marination machine",
      "Tumbling machine",
      "Rounder & burger area",
      "Three-compartment sink",
      "Lockers & changing rooms",
      "Distribution board",
      "Checker plates",
      "Grease trap",
      "Garbage bins",
      "Sockets & trunking",
      "Chiller & freezer gaskets",
      "Waste pipe (washroom)",
      "Dry goods store",
      "Chips upright freezer",
      "Castor wheels & equipment",
      "Air curtain (BOH)",
    ],
  },
  {
    name: "External & structure",
    subAreas: [
      "Red dot update",
      "Receiving area",
      "Ceiling area",
      "Drains & manholes",
      "Stairways",
    ],
  },
  {
    name: "Monitoring devices",
    subAreas: [
      "Fly control units (FCUs)",
      "Non-toxic monitoring stations",
      "Toxic bait stations",
    ],
  },
];

export function createKfcChecklist(): ChecklistArea[] {
  return buildChecklistAreas(KFC_CHECKLIST_SPEC);
}
