import type { ScheduledVisit, Site } from "./types";
import { DEFAULT_IPM_AREAS } from "./real-checklist";
import { flatNamesToChecklistAreas, flattenChecklistLabels } from "./site-checklist";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const DEFAULT_CHECKLIST = flatNamesToChecklistAreas([...DEFAULT_IPM_AREAS]);

/** Default seed when ops store is empty — live KFC Kakamega checklist */
export const SITES: Site[] = [
  {
    id: "site-01",
    clientName: "KFC",
    siteName: "Kakamega",
    address: "",
    checklistAreas: DEFAULT_CHECKLIST,
  },
  {
    id: "site-02",
    clientName: "KFC",
    siteName: "Westside Mall",
    address: "",
    checklistAreas: DEFAULT_CHECKLIST,
  },
];

export const TODAY_VISITS: ScheduledVisit[] = [
  {
    id: "visit-001",
    siteId: "site-01",
    visitType: "full_inspection",
    technicianName: "Boniface Kithinga",
    date: todayISO(),
    status: "scheduled",
    timeWindow: "08:00 – 11:30",
  },
  {
    id: "visit-002",
    siteId: "site-01",
    visitType: "follow_up",
    technicianName: "Boniface Kithinga",
    date: todayISO(),
    followUpAreas: [
      "Fly Control Units (FCUs)",
      "Grease Trap",
      "Manholes & Drainage Systems",
    ],
    parentVisitId: "visit-001",
    status: "scheduled",
    timeWindow: "12:00 – 13:00",
  },
  {
    id: "visit-003",
    siteId: "site-02",
    visitType: "full_inspection",
    technicianName: "Amina Wanjiru",
    date: todayISO(),
    status: "scheduled",
    timeWindow: "14:00 – 17:00",
  },
];

/** @deprecated Prefer ops-store — kept for seed only */
export function getSite(siteId: string): Site | undefined {
  return SITES.find((s) => s.id === siteId);
}

/** @deprecated Prefer ops-store */
export function getVisit(visitId: string): ScheduledVisit | undefined {
  return TODAY_VISITS.find((v) => v.id === visitId);
}

/** @deprecated Prefer ops-store */
export function getAvailableAreas(visit: ScheduledVisit): string[] {
  const site = getSite(visit.siteId);
  if (!site) return [];
  const labels = flattenChecklistLabels(site.checklistAreas);
  if (visit.visitType === "follow_up" && visit.followUpAreas?.length) {
    return visit.followUpAreas.filter((a) => labels.includes(a));
  }
  return labels;
}
