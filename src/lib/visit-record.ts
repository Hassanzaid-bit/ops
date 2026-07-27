import type {
  AreaInspection,
  ScheduledVisit,
  Site,
  VisitType,
} from "./types";
import { normalizeAreaInspection, normalizeTreatment } from "./types";
import { generateReport } from "./report";
import { formatTreatmentLine } from "./vocabulary";

export type VisitRecord = {
  id: string;
  visitId: string;
  siteId: string;
  clientName: string;
  siteName: string;
  visitType: VisitType;
  technicianName: string;
  date: string;
  submittedAt: string;
  areas: AreaInspection[];
  reportText: string;
};

export type VisitRecordFilter = {
  siteId?: string;
  clientName?: string;
  visitType?: VisitType | "all";
  from?: string;
  to?: string;
  area?: string;
  pestType?: string;
  recommendation?: string;
};

export function buildVisitRecord(
  visit: ScheduledVisit,
  site: Site,
  areas: AreaInspection[],
  submittedAt = new Date().toISOString(),
): VisitRecord {
  return {
    id: `rec-${visit.id}-${submittedAt.slice(0, 10)}`,
    visitId: visit.id,
    siteId: site.id,
    clientName: site.clientName,
    siteName: site.siteName,
    visitType: visit.visitType,
    technicianName: visit.technicianName,
    date: visit.date,
    submittedAt,
    areas,
    reportText: generateReport(visit, site, areas),
  };
}

export function queryRecords(
  records: VisitRecord[],
  filter: VisitRecordFilter = {},
): VisitRecord[] {
  return records.filter((r) => {
    if (filter.siteId && r.siteId !== filter.siteId) return false;
    if (filter.clientName && r.clientName !== filter.clientName) return false;
    if (
      filter.visitType &&
      filter.visitType !== "all" &&
      r.visitType !== filter.visitType
    ) {
      return false;
    }
    if (filter.from && r.date < filter.from) return false;
    if (filter.to && r.date > filter.to) return false;
    if (filter.area && !r.areas.some((a) => a.area === filter.area)) return false;
    if (
      filter.pestType &&
      !r.areas.some((a) => {
        const n = normalizeAreaInspection(a, a.area);
        return n.pestTypes.includes(filter.pestType!);
      })
    ) {
      return false;
    }
    if (
      filter.recommendation &&
      !r.areas.some((a) => {
        const n = normalizeAreaInspection(a, a.area);
        return n.advice.includes(filter.recommendation!);
      })
    ) {
      return false;
    }
    return true;
  });
}

export type AreaFact = {
  recordId: string;
  visitId: string;
  date: string;
  clientName: string;
  siteName: string;
  siteId: string;
  visitType: VisitType;
  technicianName: string;
  area: string;
  status: string | null;
  findings: string[];
  pestTypes: string[];
  notes: string;
  treatmentMethods: string[];
  treatments: string;
  product: string;
  quantity: string;
  recommendations: string[];
  photoCount: number;
  followUpFlagged: boolean;
};

export function toAreaFacts(records: VisitRecord[]): AreaFact[] {
  const facts: AreaFact[] = [];
  for (const r of records) {
    for (const raw of r.areas) {
      const a = normalizeAreaInspection(raw, raw.area);
      const tx = normalizeTreatment(a.treatment);
      facts.push({
        recordId: r.id,
        visitId: r.visitId,
        date: r.date,
        clientName: r.clientName,
        siteName: r.siteName,
        siteId: r.siteId,
        visitType: r.visitType,
        technicianName: r.technicianName,
        area: a.area,
        status: a.status,
        findings: a.findings,
        pestTypes: a.pestTypes,
        notes: a.notes,
        treatmentMethods: tx.serviceActions,
        treatments: tx.applications.map(formatTreatmentLine).join("; "),
        product: tx.applications.map((x) => x.product).join("; "),
        quantity: tx.applications.map((x) => x.quantity).join("; "),
        recommendations: a.advice,
        photoCount: a.photoCount,
        followUpFlagged: a.advice.includes("Follow-up visit required"),
      });
    }
  }
  return facts;
}

export type FollowUpHotspot = {
  siteId: string;
  clientName: string;
  siteName: string;
  area: string;
  followUpCount: number;
  lastDate: string;
};

export function followUpHotspots(records: VisitRecord[]): FollowUpHotspot[] {
  const map = new Map<string, FollowUpHotspot>();
  for (const fact of toAreaFacts(records)) {
    if (!fact.followUpFlagged && fact.visitType !== "follow_up") continue;
    const key = `${fact.siteId}::${fact.area}`;
    const existing = map.get(key);
    const bump =
      fact.followUpFlagged || fact.visitType === "follow_up" ? 1 : 0;
    if (!existing) {
      map.set(key, {
        siteId: fact.siteId,
        clientName: fact.clientName,
        siteName: fact.siteName,
        area: fact.area,
        followUpCount: bump,
        lastDate: fact.date,
      });
    } else {
      existing.followUpCount += bump;
      if (fact.date > existing.lastDate) existing.lastDate = fact.date;
    }
  }
  return [...map.values()].sort((a, b) => b.followUpCount - a.followUpCount);
}

export type PestPattern = {
  siteName: string;
  area: string;
  pestType: string;
  occurrences: number;
  lastDate: string;
};

export function pestPatterns(records: VisitRecord[]): PestPattern[] {
  const map = new Map<string, PestPattern>();
  for (const fact of toAreaFacts(records)) {
    for (const pest of fact.pestTypes) {
      const key = `${fact.siteId}::${fact.area}::${pest}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          siteName: fact.siteName,
          area: fact.area,
          pestType: pest,
          occurrences: 1,
          lastDate: fact.date,
        });
      } else {
        existing.occurrences += 1;
        if (fact.date > existing.lastDate) existing.lastDate = fact.date;
      }
    }
  }
  return [...map.values()].sort((a, b) => b.occurrences - a.occurrences);
}

export function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function areaFactsToCsv(facts: AreaFact[]): string {
  const headers = [
    "date",
    "client",
    "site",
    "visit_type",
    "technician",
    "area",
    "status",
    "findings",
    "pests",
    "notes",
    "treatment",
    "service_actions",
    "product",
    "quantity",
    "advice",
    "photos",
    "follow_up_flagged",
  ];
  const rows = facts.map((f) =>
    [
      f.date,
      f.clientName,
      f.siteName,
      f.visitType,
      f.technicianName,
      f.area,
      f.status ?? "",
      f.findings.join("; "),
      f.pestTypes.join("; "),
      f.notes,
      f.treatments,
      f.treatmentMethods.join("; "),
      f.product,
      f.quantity,
      f.recommendations.join("; "),
      String(f.photoCount),
      f.followUpFlagged ? "yes" : "no",
    ]
      .map(csvEscape)
      .join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}
