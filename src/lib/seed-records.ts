import type { AreaInspection } from "./types";
import type { VisitRecord } from "./visit-record";
import {
  emptyAreaInspection,
  emptyPointsForArea,
  normalizeAreaInspection,
  syncAreaDerivedFields,
} from "./types";
import { getTreatmentCatalogItem } from "./vocabulary";

type AreaSeed = {
  area: string;
  rating: "good" | "fair" | "poor";
  conditions?: string[];
  pests?: string[];
  evidence?: string[];
  severity?: "low" | "medium" | "high";
  methods?: string[];
  /** Catalog product name e.g. Fendona, Goliath, Tomcat */
  catalogProduct?: string;
  /** Extra products applied on this area */
  extraProducts?: { product: string; qty: string }[];
  qty?: string;
  rec?: string[];
  notes: string;
  device?: { count: string; actions: string[] };
};

function insp(s: AreaSeed): AreaInspection {
  const apps: AreaInspection["treatment"]["applications"] = [];
  const addProduct = (product: string, qty?: string) => {
    const cat = getTreatmentCatalogItem(product);
    if (!cat) return;
    apps.push({
      product: cat.product,
      method: cat.method,
      activeIngredient: cat.activeIngredient,
      antidote: cat.antidote,
      quantity: qty ?? cat.defaultQuantity,
    });
  };
  if (s.catalogProduct) addProduct(s.catalogProduct, s.qty);
  for (const extra of s.extraProducts ?? []) {
    addProduct(extra.product, extra.qty);
  }

  const status =
    s.rating === "poor" ||
    s.rating === "fair" ||
    (s.conditions ?? []).some((c) => c !== "None observed")
      ? "issues"
      : "clean";

  // Omit points so normalize migrates legacy fields into schema v2 points
  return normalizeAreaInspection(
    {
      area: s.area,
      status,
      findings: (s.conditions ?? []).filter((c) => c !== "None observed"),
      pestTypes: (s.pests ?? []).filter((p) => p !== "None observed"),
      treatment: {
        applications: apps,
        serviceActions: s.methods ?? [],
      },
      deviceService: s.device
        ? {
            enabled: true,
            count: s.device.count,
            actions: s.device.actions,
          }
        : emptyAreaInspection().deviceService,
      advice: s.rec ?? ["Continue routine monitoring"],
      notes: s.notes,
      photoCount: 0,
    },
    s.area,
  );
}

/** Inject MD-pack demo signal: severity, conducive, escalation, species */
function enrichMdPackSeed(areas: AreaInspection[]): AreaInspection[] {
  return areas.map((raw) => {
    const a = normalizeAreaInspection(raw, raw.area);
    const points = emptyPointsForArea(a.area).map((template) => {
      const existing =
        a.points.find((p) => p.pointId === template.pointId) ?? template;
      return { ...template, ...existing, pointId: template.pointId, label: template.label };
    });

    if (a.area === "Fly Control Units (FCUs)") {
      const idx = points.findIndex((p) => p.pointId === "units");
      const i = idx >= 0 ? idx : 0;
      points[i] = {
        ...points[i],
        outcome: "issue",
        identification: { pestType: "fly", evidence: "glue_board" },
        thresholdLevel: "moderate",
        conduciveCondition: { present: true, type: "food_debris" },
        actionTier: "targeted_treatment",
        note: "Moderate fly catch on FCU boards; food debris near waste route.",
      };
      if (points[1]) {
        points[1] = {
          ...points[1],
          outcome: "issue",
          identification: { pestType: "fly", evidence: "glue_board" },
          thresholdLevel: "light",
          conduciveCondition: { present: false, type: null },
          actionTier: "monitor",
          note: "Boards replaced; continue monitoring.",
        };
      }
      if (points[2]) {
        points[2] = {
          ...points[2],
          outcome: "issue",
          identification: { pestType: null, evidence: null },
          thresholdLevel: "light",
          conduciveCondition: { present: true, type: "dirty" },
          actionTier: "exclusion_sanitation",
          note: "Surrounding hygiene supporting fly pressure — client action.",
        };
      }
      return syncAreaDerivedFields({
        ...a,
        points,
        recommendation: "Follow-up visit required",
        treatmentApplied: "corrective",
      });
    }

    if (a.area === "Grease Trap") {
      const idx = points.findIndex((p) => p.pointId === "surrounds");
      const i = idx >= 0 ? idx : 0;
      points[i] = {
        ...points[i],
        outcome: "issue",
        identification: { pestType: "cockroach_german", evidence: "live_activity" },
        thresholdLevel: "heavy",
        conduciveCondition: { present: true, type: "food_debris" },
        actionTier: "escalation",
        note: "Heavy German cockroach activity at grease-trap surrounds.",
      };
      for (let j = 0; j < points.length; j++) {
        if (j === i) continue;
        if (points[j].outcome === null) {
          points[j] = {
            ...points[j],
            outcome: "clean",
            thresholdLevel: "none",
            actionTier: "monitor",
          };
        }
      }
      return syncAreaDerivedFields({
        ...a,
        points,
        recommendation: "Follow-up visit required",
        treatmentApplied: "corrective",
      });
    }

    if (a.area === "Trunking & Industrial Sockets") {
      const idx = points.findIndex((p) => p.pointId === "sockets");
      const i = idx >= 0 ? idx : 0;
      points[i] = {
        ...points[i],
        outcome: "issue",
        identification: { pestType: null, evidence: null },
        thresholdLevel: "moderate",
        conduciveCondition: { present: true, type: "not_sealed" },
        actionTier: "exclusion_sanitation",
        note: "One industrial socket found open — exclusion fix required.",
      };
      for (let j = 0; j < points.length; j++) {
        if (j === i) continue;
        if (points[j].outcome === null) {
          points[j] = {
            ...points[j],
            outcome: "clean",
            thresholdLevel: "none",
            actionTier: "monitor",
          };
        }
      }
      return syncAreaDerivedFields({
        ...a,
        points,
        recommendation: "Client action needed",
        treatmentApplied: a.treatmentApplied,
      });
    }

    if (a.area === "Dry Goods Store") {
      const idx = points.findIndex((p) => p.pointId === "floor");
      const i = idx >= 0 ? idx : 0;
      points[i] = {
        ...points[i],
        outcome: "issue",
        identification: { pestType: "rodent", evidence: "droppings" },
        thresholdLevel: "light",
        conduciveCondition: { present: true, type: "clutter" },
        actionTier: "targeted_treatment",
        note: "Light rodent signs at perimeter; stock clutter noted.",
      };
      for (let j = 0; j < points.length; j++) {
        if (j === i) continue;
        if (points[j].outcome === null) {
          points[j] = {
            ...points[j],
            outcome: "clean",
            thresholdLevel: "none",
            actionTier: "monitor",
          };
        }
      }
      return syncAreaDerivedFields({
        ...a,
        points,
        recommendation:
          "Monitor closely following treatment to confirm resolution",
        treatmentApplied: "corrective",
      });
    }

    return a;
  });
}

/** Full IPM report text from live client sample */
export const SAMPLE_IPM_REPORT = `INTEGRATED PEST MANAGEMENT (IPM) SERVICE REPORT

RED DOT UPDATE
• A thorough structural inspection was conducted to verify the presence of previously installed Red Dot markers.
• No previous Red Dot markers were identified during the inspection.
• The overall structural condition of the facility was found to be satisfactory, with no visible gaps, cracks, or openings that could facilitate pest entry.
• The premises currently present a low risk of pest ingress.

COUNTER SECTION
• The service counter was inspected and found to be clean, well organised, and free from food residues.
• No conditions conducive to pest activity were observed.

SODA FRIDGES
• All beverage refrigeration units were inspected internally and externally.
• The units were maintained in hygienic condition, with no spillages, contamination, or conditions that could encourage pest activity observed.

CRUSHER & ICE CREAM MACHINES
• The crusher and ice cream dispensing machines were inspected and found to be clean and in good working condition.
• No food residue accumulation or sanitation concerns were observed.

CASH COUNTER
• The cash counter area was inspected and found to be clean, orderly, and well maintained.
• No structural defects or conditions conducive to pest harbourage were observed.

AIR CURTAINS
• Air curtain units were inspected and confirmed to be operational.
• The units were functioning effectively as a barrier against flying insect ingress.

CEILING SECTION
• Accessible ceiling voids and overhead sections were inspected.
• The areas were found clean, with no visible signs of pest activity or structural openings.
• Four (4) rodent monitoring devices installed within the ceiling voids were inspected and serviced.
• The monitoring devices were found to be in good condition.

UNDER SEATS
• All seating areas, including chairs and couches, were inspected.
• The areas were found clean and well maintained.
• No conditions conducive to pest harbourage were observed.

DISPENSERS
• Soap and other dispensers were inspected and found clean, functional, and in good condition.
• Surrounding areas were maintained in hygienic condition.

WASHROOMS
• Washroom facilities were inspected and found clean and well maintained.
• No conditions conducive to pest breeding or harbourage were observed.
• Preventive treatment was applied around drainage outlets as part of routine IPM maintenance.

TUMBLING MACHINE & MARINATOR MACHINE
• The equipment and surrounding areas, including undersides and castor wheels, were inspected.
• The areas were found clean and free from food residue accumulation.
• Preventive treatment was carried out as part of the routine IPM programme.

DB BOARD
• The electrical distribution board area was inspected and found neat, organised, and free from dust accumulation.
• No conditions conducive to pest harbourage were observed.

ROUNDER & BURGER SECTION
• Food preparation areas, including fryers, coating stations, cabinets, and associated equipment, were inspected.
• The area was found clean, well organised, and maintained to good hygiene standards.

OFFICE DRAWERS & SHELVES
• Office drawers, cabinets, and storage compartments were inspected.
• The areas were found orderly, clean, and well maintained.

TRUNKING & INDUSTRIAL SOCKETS
• Electrical trunking and socket points were inspected.
• All fittings were found intact and properly sealed, with no visible gaps or openings requiring attention.

THREE-COMPARTMENT SINK
• The sink area was inspected and found clean and well maintained.
• Drainage points were inspected and found free from food debris and sanitation concerns.

GASKETS (CHILLERS & FREEZERS)
• Chiller and freezer door seals were inspected and found intact, clean, and properly fitted.
• The seals were providing effective protection against potential pest entry.

DRY GOODS STORE
• The dry goods store was inspected and found clean, organised, and well maintained.
• Shelving was properly arranged, and stock was stored off the floor to facilitate cleaning and inspection.
• No damaged packaging or conditions conducive to pest activity were observed.

GREASE TRAP
• The grease trap was inspected, cleaned, and treated as part of the preventive maintenance programme.
• Routine cleaning and servicing are recommended to prevent grease accumulation and maintain hygiene standards.

CHIPS UPRIGHT FREEZER
• The upright freezer was inspected internally and externally.
• The unit was found clean and free from conditions conducive to pest activity.

CASTOR WHEELS (EQUIPMENT)
• Movable equipment castor wheels were inspected.
• The wheels and surrounding areas were found clean and free from food debris accumulation.

STAFF LOCKERS
• Staff lockers within the changing rooms were inspected.
• The lockers were found clean and orderly.
• Preventive treatment was carried out as part of the routine IPM programme.

FLY CONTROL UNITS (FCUs)
• Three (3) Fly Control Units were inspected, cleaned, serviced, and fitted with new adhesive glue boards.
• Low levels of flying insect activity were observed and will continue to be monitored.
• Maintaining high hygiene standards, particularly around food preparation and waste disposal areas, is recommended to support effective fly control.

NON-TOXIC MONITORING DEVICES
• Six (6) Non-Toxic Monitoring Stations were inspected, cleaned, and fitted with fresh adhesive monitoring inserts.
• The monitoring devices were correctly positioned and found to be in good working condition.
• Continued monitoring is recommended to ensure early detection of pest activity.

TOXIC BAIT STATIONS
• Ten (10) Toxic Bait Stations were inspected, serviced, and replenished with fresh rodenticide bait.
• All stations were secure, properly labelled, and correctly positioned.
• Routine servicing and monitoring should continue as part of the rodent management programme.

MANHOLES & DRAINAGE SYSTEMS
• All accessible manholes and drainage points were inspected and found clean and well maintained.
• Preventive treatment was carried out throughout the drainage system.
• No conditions requiring corrective action were identified.
• Drain covers were intact and secure.
• Regular cleaning and maintenance of drainage systems are recommended to ensure proper flow and maintain high hygiene standards.`;

const FULL_INSPECTION_AREAS: AreaSeed[] = [
  {
    area: "Red Dot Update",
    rating: "good",
    severity: "low",
    methods: ["Inspected only"],
    notes:
      "A thorough structural inspection was conducted to verify the presence of previously installed Red Dot markers.\nNo previous Red Dot markers were identified during the inspection.\nThe overall structural condition of the facility was found to be satisfactory, with no visible gaps, cracks, or openings that could facilitate pest entry.\nThe premises currently present a low risk of pest ingress.",
  },
  {
    area: "Counter Section",
    rating: "good",
    notes:
      "The service counter was inspected and found to be clean, well organised, and free from food residues.\nNo conditions conducive to pest activity were observed.",
  },
  {
    area: "Soda Fridges",
    rating: "good",
    notes:
      "All beverage refrigeration units were inspected internally and externally.\nThe units were maintained in hygienic condition, with no spillages, contamination, or conditions that could encourage pest activity observed.",
  },
  {
    area: "Crusher & Ice Cream Machines",
    rating: "good",
    notes:
      "The crusher and ice cream dispensing machines were inspected and found to be clean and in good working condition.\nNo food residue accumulation or sanitation concerns were observed.",
  },
  {
    area: "Cash Counter",
    rating: "good",
    notes:
      "The cash counter area was inspected and found to be clean, orderly, and well maintained.\nNo structural defects or conditions conducive to pest harbourage were observed.",
  },
  {
    area: "Air Curtains",
    rating: "good",
    methods: ["Inspected only"],
    notes:
      "Air curtain units were inspected and confirmed to be operational.\nThe units were functioning effectively as a barrier against flying insect ingress.",
  },
  {
    area: "Ceiling Section",
    rating: "good",
    methods: ["Rodent monitors serviced"],
    device: {
      count: "4",
      actions: ["Inspected and serviced"],
    },
    notes:
      "Accessible ceiling voids and overhead sections were inspected.\nThe areas were found clean, with no visible signs of pest activity or structural openings.\nFour (4) rodent monitoring devices installed within the ceiling voids were inspected and serviced.\nThe monitoring devices were found to be in good condition.",
  },
  {
    area: "Under Seats",
    rating: "good",
    notes:
      "All seating areas, including chairs and couches, were inspected.\nThe areas were found clean and well maintained.\nNo conditions conducive to pest harbourage were observed.",
  },
  {
    area: "Dispensers",
    rating: "good",
    notes:
      "Soap and other dispensers were inspected and found clean, functional, and in good condition.\nSurrounding areas were maintained in hygienic condition.",
  },
  {
    area: "Washrooms",
    rating: "good",
    methods: ["Preventive treatment applied"],
    catalogProduct: "Fendona",
    qty: "25 ml",
    notes:
      "Washroom facilities were inspected and found clean and well maintained.\nNo conditions conducive to pest breeding or harbourage were observed.\nPreventive treatment was applied around drainage outlets as part of routine IPM maintenance.",
  },
  {
    area: "Tumbling Machine & Marinator Machine",
    rating: "good",
    methods: ["Preventive treatment applied"],
    catalogProduct: "Goliath",
    qty: "5 gr",
    notes:
      "The equipment and surrounding areas, including undersides and castor wheels, were inspected.\nThe areas were found clean and free from food residue accumulation.\nPreventive treatment was carried out as part of the routine IPM programme.",
  },
  {
    area: "DB Board",
    rating: "good",
    notes:
      "The electrical distribution board area was inspected and found neat, organised, and free from dust accumulation.\nNo conditions conducive to pest harbourage were observed.",
  },
  {
    area: "Rounder & Burger Section",
    rating: "good",
    notes:
      "Food preparation areas, including fryers, coating stations, cabinets, and associated equipment, were inspected.\nThe area was found clean, well organised, and maintained to good hygiene standards.",
  },
  {
    area: "Office Drawers & Shelves",
    rating: "good",
    notes:
      "Office drawers, cabinets, and storage compartments were inspected.\nThe areas were found orderly, clean, and well maintained.",
  },
  {
    area: "Trunking & Industrial Sockets",
    rating: "good",
    notes:
      "Electrical trunking and socket points were inspected.\nAll fittings were found intact and properly sealed, with no visible gaps or openings requiring attention.",
  },
  {
    area: "Three-Compartment Sink",
    rating: "good",
    notes:
      "The sink area was inspected and found clean and well maintained.\nDrainage points were inspected and found free from food debris and sanitation concerns.",
  },
  {
    area: "Gaskets (Chillers & Freezers)",
    rating: "good",
    notes:
      "Chiller and freezer door seals were inspected and found intact, clean, and properly fitted.\nThe seals were providing effective protection against potential pest entry.",
  },
  {
    area: "Dry Goods Store",
    rating: "good",
    notes:
      "The dry goods store was inspected and found clean, organised, and well maintained.\nShelving was properly arranged, and stock was stored off the floor to facilitate cleaning and inspection.\nNo damaged packaging or conditions conducive to pest activity were observed.",
  },
  {
    area: "Grease Trap",
    rating: "good",
    methods: ["Grease trap cleaned & treated"],
    rec: ["Routine cleaning / servicing recommended", "Follow-up visit required"],
    notes:
      "The grease trap was inspected, cleaned, and treated as part of the preventive maintenance programme.\nRoutine cleaning and servicing are recommended to prevent grease accumulation and maintain hygiene standards.\nA follow-up visit is required to confirm trap condition after heavy service periods.",
  },
  {
    area: "Chips Upright Freezer",
    rating: "good",
    notes:
      "The upright freezer was inspected internally and externally.\nThe unit was found clean and free from conditions conducive to pest activity.",
  },
  {
    area: "Castor Wheels (Equipment)",
    rating: "good",
    notes:
      "Movable equipment castor wheels were inspected.\nThe wheels and surrounding areas were found clean and free from food debris accumulation.",
  },
  {
    area: "Staff Lockers",
    rating: "good",
    methods: ["Preventive treatment applied"],
    notes:
      "Staff lockers within the changing rooms were inspected.\nThe lockers were found clean and orderly.\nPreventive treatment was carried out as part of the routine IPM programme.",
  },
  {
    area: "Fly Control Units (FCUs)",
    rating: "good",
    pests: ["Flying insects (unspecified)"],
    evidence: ["Low activity", "Glue board catch"],
    severity: "low",
    methods: ["Cleaned and serviced", "FCU glue boards replaced"],
    device: {
      count: "3",
      actions: ["Inspected and serviced", "Fitted new glue boards / inserts"],
    },
    rec: [
      "Maintain high hygiene standards",
      "Follow-up visit required",
      "Continue routine monitoring",
    ],
    notes:
      "Three (3) Fly Control Units were inspected, cleaned, serviced, and fitted with new adhesive glue boards.\nLow levels of flying insect activity were observed and will continue to be monitored.\nMaintaining high hygiene standards, particularly around food preparation and waste disposal areas, is recommended to support effective fly control.\nA follow-up visit is required to reassess flying insect pressure after glue-board replacement.",
  },
  {
    area: "Non-Toxic Monitoring Devices",
    rating: "good",
    methods: ["Cleaned and serviced", "Monitoring inserts replaced"],
    device: {
      count: "6",
      actions: ["Inspected and serviced", "Fitted new glue boards / inserts"],
    },
    rec: ["Continue routine monitoring"],
    notes:
      "Six (6) Non-Toxic Monitoring Stations were inspected, cleaned, and fitted with fresh adhesive monitoring inserts.\nThe monitoring devices were correctly positioned and found to be in good working condition.\nContinued monitoring is recommended to ensure early detection of pest activity.",
  },
  {
    area: "Toxic Bait Stations",
    rating: "good",
    catalogProduct: "Tomcat",
    qty: "80 gr",
    methods: ["Bait stations replenished"],
    device: {
      count: "10",
      actions: ["Inspected and serviced", "Replenished bait"],
    },
    rec: ["Continue routine monitoring"],
    notes:
      "Ten (10) Toxic Bait Stations were inspected, serviced, and replenished with fresh rodenticide bait.\nAll stations were secure, properly labelled, and correctly positioned.\nRoutine servicing and monitoring should continue as part of the rodent management programme.",
  },
  {
    area: "Manholes & Drainage Systems",
    rating: "good",
    methods: ["Preventive treatment applied"],
    rec: ["Routine cleaning / servicing recommended"],
    notes:
      "All accessible manholes and drainage points were inspected and found clean and well maintained.\nPreventive treatment was carried out throughout the drainage system.\nNo conditions requiring corrective action were identified.\nDrain covers were intact and secure.\nRegular cleaning and maintenance of drainage systems are recommended to ensure proper flow and maintain high hygiene standards.",
  },
];

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const GOLDEN_DATE = "2026-07-23";
const REPORT_HEADER = `INTEGRATED PEST MANAGEMENT (IPM) SERVICE REPORT

Client: KFC
Site: Kakamega
Visit type: Full Inspection
Technician: Boniface Kithinga
Date: ${GOLDEN_DATE}

`;

/** Seed from live KFC Kakamega IPM report — queryable structure underneath */
export const SEED_RECORDS: VisitRecord[] = [
  {
    id: "rec-ipm-001",
    visitId: "hist-ipm-001",
    siteId: "site-01",
    clientName: "KFC",
    siteName: "Kakamega",
    visitType: "full_inspection",
    technicianName: "Boniface Kithinga",
    date: GOLDEN_DATE,
    submittedAt: `${GOLDEN_DATE}T16:40:00.000Z`,
    areas: enrichMdPackSeed(FULL_INSPECTION_AREAS.map(insp)),
    reportText: REPORT_HEADER + SAMPLE_IPM_REPORT.replace(
      "INTEGRATED PEST MANAGEMENT (IPM) SERVICE REPORT\n\n",
      "",
    ),
  },
  {
    id: "rec-ipm-002",
    visitId: "hist-ipm-002",
    siteId: "site-01",
    clientName: "KFC",
    siteName: "Kakamega",
    visitType: "full_inspection",
    technicianName: "Boniface Kithinga",
    date: daysAgo(7),
    submittedAt: `${daysAgo(7)}T15:10:00.000Z`,
    areas: enrichMdPackSeed(FULL_INSPECTION_AREAS.map(insp)),
    reportText: SAMPLE_IPM_REPORT,
  },
  {
    id: "rec-ipm-003",
    visitId: "hist-ipm-003",
    siteId: "site-01",
    clientName: "KFC",
    siteName: "Kakamega",
    visitType: "follow_up",
    technicianName: "Boniface Kithinga",
    date: daysAgo(3),
    submittedAt: `${daysAgo(3)}T11:20:00.000Z`,
    areas: enrichMdPackSeed([
      insp({
        area: "Fly Control Units (FCUs)",
        rating: "good",
        pests: ["Flying insects (unspecified)"],
        evidence: ["Low activity", "Glue board catch"],
        severity: "low",
        methods: ["Cleaned and serviced", "FCU glue boards replaced"],
        device: {
          count: "3",
          actions: ["Inspected and serviced", "Fitted new glue boards / inserts"],
        },
        rec: [
          "Maintain high hygiene standards",
          "Follow-up visit required",
          "Continue routine monitoring",
        ],
        notes:
          "Three (3) Fly Control Units were inspected, cleaned, serviced, and fitted with new adhesive glue boards.\nLow levels of flying insect activity were observed and will continue to be monitored.\nMaintaining high hygiene standards, particularly around food preparation and waste disposal areas, is recommended to support effective fly control.\nA follow-up visit is required to reassess flying insect pressure after glue-board replacement.",
      }),
      insp({
        area: "Grease Trap",
        rating: "good",
        methods: ["Grease trap cleaned & treated"],
        rec: [
          "Routine cleaning / servicing recommended",
          "Follow-up visit required",
        ],
        notes:
          "The grease trap was inspected, cleaned, and treated as part of the preventive maintenance programme.\nRoutine cleaning and servicing are recommended to prevent grease accumulation and maintain hygiene standards.\nA follow-up visit is required to confirm trap condition after heavy service periods.",
      }),
      insp({
        area: "Manholes & Drainage Systems",
        rating: "good",
        methods: ["Preventive treatment applied"],
        rec: ["Routine cleaning / servicing recommended"],
        notes:
          "All accessible manholes and drainage points were inspected and found clean and well maintained.\nPreventive treatment was carried out throughout the drainage system.\nNo conditions requiring corrective action were identified.\nDrain covers were intact and secure.\nRegular cleaning and maintenance of drainage systems are recommended to ensure proper flow and maintain high hygiene standards.",
      }),
    ]),
    reportText: `INTEGRATED PEST MANAGEMENT (IPM) SERVICE REPORT

Client: KFC
Site: Kakamega
Visit type: Follow-up
Technician: Boniface Kithinga

FLY CONTROL UNITS (FCUs)
• Three (3) Fly Control Units were inspected, cleaned, serviced, and fitted with new adhesive glue boards.
• Low levels of flying insect activity were observed and will continue to be monitored.
• Maintaining high hygiene standards, particularly around food preparation and waste disposal areas, is recommended to support effective fly control.

GREASE TRAP
• The grease trap was inspected, cleaned, and treated as part of the preventive maintenance programme.
• Routine cleaning and servicing are recommended to prevent grease accumulation and maintain hygiene standards.

MANHOLES & DRAINAGE SYSTEMS
• All accessible manholes and drainage points were inspected and found clean and well maintained.
• Preventive treatment was carried out throughout the drainage system.
• No conditions requiring corrective action were identified.
• Drain covers were intact and secure.
• Regular cleaning and maintenance of drainage systems are recommended to ensure proper flow and maintain high hygiene standards.`,
  },
  {
    id: "rec-ipm-004",
    visitId: "hist-ipm-004",
    siteId: "site-02",
    clientName: "KFC",
    siteName: "Westside Mall",
    visitType: "full_inspection",
    technicianName: "Amina Wanjiru",
    date: daysAgo(5),
    submittedAt: `${daysAgo(5)}T14:00:00.000Z`,
    areas: enrichMdPackSeed(FULL_INSPECTION_AREAS.map(insp)),
    reportText: SAMPLE_IPM_REPORT.replace(
      "INTEGRATED PEST MANAGEMENT (IPM) SERVICE REPORT",
      "INTEGRATED PEST MANAGEMENT (IPM) SERVICE REPORT\n\nClient: KFC\nSite: Westside Mall",
    ),
  },
];
