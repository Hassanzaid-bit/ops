/**
 * Default per-site checklist extracted from live IPM Service Reports.
 * Areas remain site-specific — this is a starter list for seed / new branches.
 */
export const DEFAULT_IPM_AREAS = [
  "Red Dot Update",
  "Counter Section",
  "Soda Fridges",
  "Crusher & Ice Cream Machines",
  "Cash Counter",
  "Air Curtains",
  "Ceiling Section",
  "Under Seats",
  "Dispensers",
  "Washrooms",
  "Tumbling Machine & Marinator Machine",
  "DB Board",
  "Rounder & Burger Section",
  "Office Drawers & Shelves",
  "Trunking & Industrial Sockets",
  "Three-Compartment Sink",
  "Gaskets (Chillers & Freezers)",
  "Dry Goods Store",
  "Grease Trap",
  "Chips Upright Freezer",
  "Castor Wheels (Equipment)",
  "Staff Lockers",
  "Fly Control Units (FCUs)",
  "Non-Toxic Monitoring Devices",
  "Toxic Bait Stations",
  "Manholes & Drainage Systems",
] as const;

export type DefaultIpmArea = (typeof DEFAULT_IPM_AREAS)[number];
