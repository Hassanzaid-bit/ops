import type { AreaFact, VisitRecord } from "./visit-record";
import { toAreaFacts } from "./visit-record";
import { normalizeAreaInspection, normalizeTreatment } from "./types";

export function issueRate(facts: AreaFact[]): number {
  if (facts.length === 0) return 0;
  const issues = facts.filter((f) => f.status === "issues").length;
  return Math.round((issues / facts.length) * 100);
}

export function countAdvice(facts: AreaFact[], label: string): number {
  return facts.filter((f) => f.recommendations.includes(label)).length;
}

export function treatmentsAppliedCount(facts: AreaFact[]): number {
  return facts.filter((f) => f.product.trim().length > 0).length;
}

export type SiteRiskRow = {
  siteId: string;
  clientName: string;
  siteName: string;
  visits: number;
  issues: number;
  areas: number;
  issuePct: number;
  followUpsFlagged: number;
  lastDate: string;
};

export function siteRiskRows(records: VisitRecord[]): SiteRiskRow[] {
  const map = new Map<
    string,
    {
      siteId: string;
      clientName: string;
      siteName: string;
      visitIds: Set<string>;
      issues: number;
      areas: number;
      followUpsFlagged: number;
      lastDate: string;
    }
  >();

  for (const r of records) {
    let row = map.get(r.siteId);
    if (!row) {
      row = {
        siteId: r.siteId,
        clientName: r.clientName,
        siteName: r.siteName,
        visitIds: new Set(),
        issues: 0,
        areas: 0,
        followUpsFlagged: 0,
        lastDate: r.date,
      };
      map.set(r.siteId, row);
    }
    row.visitIds.add(r.visitId);
    if (r.date > row.lastDate) row.lastDate = r.date;

    for (const raw of r.areas) {
      const a = normalizeAreaInspection(raw, raw.area);
      row.areas += 1;
      if (a.status === "issues") row.issues += 1;
      if (a.advice.includes("Follow-up visit required")) {
        row.followUpsFlagged += 1;
      }
    }
  }

  return [...map.values()]
    .map((row) => ({
      siteId: row.siteId,
      clientName: row.clientName,
      siteName: row.siteName,
      visits: row.visitIds.size,
      issues: row.issues,
      areas: row.areas,
      issuePct: row.areas ? Math.round((row.issues / row.areas) * 100) : 0,
      followUpsFlagged: row.followUpsFlagged,
      lastDate: row.lastDate,
    }))
    .sort(
      (a, b) =>
        b.followUpsFlagged - a.followUpsFlagged || b.issuePct - a.issuePct,
    );
}

export type FindingCount = {
  finding: string;
  count: number;
  lastDate: string;
};

export function findingCounts(facts: AreaFact[]): FindingCount[] {
  const map = new Map<string, FindingCount>();
  for (const f of facts) {
    for (const finding of f.findings) {
      const existing = map.get(finding);
      if (!existing) {
        map.set(finding, { finding, count: 1, lastDate: f.date });
      } else {
        existing.count += 1;
        if (f.date > existing.lastDate) existing.lastDate = f.date;
      }
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

export type PestRollup = {
  pestType: string;
  occurrences: number;
  lastDate: string;
};

export function pestRollups(facts: AreaFact[]): PestRollup[] {
  const map = new Map<string, PestRollup>();
  for (const f of facts) {
    for (const pest of f.pestTypes) {
      const existing = map.get(pest);
      if (!existing) {
        map.set(pest, { pestType: pest, occurrences: 1, lastDate: f.date });
      } else {
        existing.occurrences += 1;
        if (f.date > existing.lastDate) existing.lastDate = f.date;
      }
    }
  }
  return [...map.values()].sort((a, b) => b.occurrences - a.occurrences);
}

export type ProductUsage = {
  product: string;
  applications: number;
  sitesTouched: number;
  lastDate: string;
};

export function productUsage(facts: AreaFact[]): ProductUsage[] {
  const map = new Map<
    string,
    { product: string; applications: number; sites: Set<string>; lastDate: string }
  >();

  for (const f of facts) {
    const products = f.product
      .split(";")
      .map((p) => p.trim())
      .filter(Boolean);
    // Prefer splitting from product field; also walk raw if empty
    const list =
      products.length > 0
        ? products
        : [];
    for (const product of list) {
      let row = map.get(product);
      if (!row) {
        row = {
          product,
          applications: 0,
          sites: new Set(),
          lastDate: f.date,
        };
        map.set(product, row);
      }
      row.applications += 1;
      row.sites.add(f.siteId);
      if (f.date > row.lastDate) row.lastDate = f.date;
    }
  }

  return [...map.values()]
    .map((row) => ({
      product: row.product,
      applications: row.applications,
      sitesTouched: row.sites.size,
      lastDate: row.lastDate,
    }))
    .sort((a, b) => b.applications - a.applications);
}

/** More accurate product usage from raw treatment applications on records */
export function productUsageFromRecords(records: VisitRecord[]): ProductUsage[] {
  const map = new Map<
    string,
    { product: string; applications: number; sites: Set<string>; lastDate: string }
  >();

  for (const r of records) {
    for (const raw of r.areas) {
      const a = normalizeAreaInspection(raw, raw.area);
      const apps = normalizeTreatment(a.treatment).applications.filter(
        (x) => x.product.trim(),
      );
      for (const app of apps) {
        const product = app.product.trim();
        let row = map.get(product);
        if (!row) {
          row = {
            product,
            applications: 0,
            sites: new Set(),
            lastDate: r.date,
          };
          map.set(product, row);
        }
        row.applications += 1;
        row.sites.add(r.siteId);
        if (r.date > row.lastDate) row.lastDate = r.date;
      }
    }
  }

  return [...map.values()]
    .map((row) => ({
      product: row.product,
      applications: row.applications,
      sitesTouched: row.sites.size,
      lastDate: row.lastDate,
    }))
    .sort((a, b) => b.applications - a.applications);
}

export type ProductUsageBySite = {
  siteId: string;
  siteName: string;
  clientName: string;
  product: string;
  applications: number;
  quantities: string;
};

export function productUsageBySite(records: VisitRecord[]): ProductUsageBySite[] {
  const map = new Map<
    string,
    {
      siteId: string;
      siteName: string;
      clientName: string;
      product: string;
      applications: number;
      qtys: string[];
    }
  >();

  for (const r of records) {
    for (const raw of r.areas) {
      const a = normalizeAreaInspection(raw, raw.area);
      const apps = normalizeTreatment(a.treatment).applications.filter(
        (x) => x.product.trim(),
      );
      for (const app of apps) {
        const product = app.product.trim();
        const key = `${r.siteId}::${product}`;
        let row = map.get(key);
        if (!row) {
          row = {
            siteId: r.siteId,
            siteName: r.siteName,
            clientName: r.clientName,
            product,
            applications: 0,
            qtys: [],
          };
          map.set(key, row);
        }
        row.applications += 1;
        if (app.quantity.trim()) row.qtys.push(app.quantity.trim());
      }
    }
  }

  return [...map.values()]
    .map((row) => ({
      siteId: row.siteId,
      siteName: row.siteName,
      clientName: row.clientName,
      product: row.product,
      applications: row.applications,
      quantities: summarizeQuantities(row.qtys),
    }))
    .sort(
      (a, b) =>
        a.siteName.localeCompare(b.siteName) ||
        b.applications - a.applications,
    );
}

function summarizeQuantities(qtys: string[]): string {
  if (qtys.length === 0) return "—";
  const counts = new Map<string, number>();
  for (const q of qtys) counts.set(q, (counts.get(q) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([q, n]) => (n > 1 ? `${q}×${n}` : q))
    .join(", ");
}

export function dashboardFacts(records: VisitRecord[]): AreaFact[] {
  return toAreaFacts(records);
}

export function visitIssuesCount(record: VisitRecord): number {
  return record.areas.filter(
    (raw) => normalizeAreaInspection(raw, raw.area).status === "issues",
  ).length;
}

export type IssueAreaRow = {
  id: string;
  recordId: string;
  siteId: string;
  date: string;
  clientName: string;
  siteName: string;
  area: string;
  findings: string[];
  pestTypes: string[];
  advice: string[];
  technicianName: string;
  visitType: VisitRecord["visitType"];
};

/** Flat register of every area marked Issues across visits */
export function issueAreaRows(records: VisitRecord[]): IssueAreaRow[] {
  const rows: IssueAreaRow[] = [];
  for (const r of records) {
    for (const raw of r.areas) {
      const a = normalizeAreaInspection(raw, raw.area);
      if (a.status !== "issues") continue;
      rows.push({
        id: `${r.id}::${a.area}`,
        recordId: r.id,
        siteId: r.siteId,
        date: r.date,
        clientName: r.clientName,
        siteName: r.siteName,
        area: a.area,
        findings: a.findings,
        pestTypes: a.pestTypes,
        advice: a.advice,
        technicianName: r.technicianName,
        visitType: r.visitType,
      });
    }
  }
  return rows.sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      a.clientName.localeCompare(b.clientName) ||
      a.siteName.localeCompare(b.siteName) ||
      a.area.localeCompare(b.area),
  );
}

export type FollowUpAreaRow = IssueAreaRow;

const FOLLOW_UP_ADVICE = "Follow-up visit required";

/** Flat register of every area flagged Follow-up visit required */
export function followUpAreaRows(records: VisitRecord[]): FollowUpAreaRow[] {
  const rows: FollowUpAreaRow[] = [];
  for (const r of records) {
    for (const raw of r.areas) {
      const a = normalizeAreaInspection(raw, raw.area);
      if (!a.advice.includes(FOLLOW_UP_ADVICE)) continue;
      rows.push({
        id: `${r.id}::${a.area}`,
        recordId: r.id,
        siteId: r.siteId,
        date: r.date,
        clientName: r.clientName,
        siteName: r.siteName,
        area: a.area,
        findings: a.findings,
        pestTypes: a.pestTypes,
        advice: a.advice,
        technicianName: r.technicianName,
        visitType: r.visitType,
      });
    }
  }
  return rows.sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      a.clientName.localeCompare(b.clientName) ||
      a.siteName.localeCompare(b.siteName) ||
      a.area.localeCompare(b.area),
  );
}

export function visitFollowUpsCount(record: VisitRecord): number {
  return record.areas.filter((raw) =>
    normalizeAreaInspection(raw, raw.area).advice.includes(FOLLOW_UP_ADVICE),
  ).length;
}

export function visitCleanCount(record: VisitRecord): number {
  return record.areas.filter(
    (raw) => normalizeAreaInspection(raw, raw.area).status === "clean",
  ).length;
}

export function visitHasAdvice(record: VisitRecord, label: string): boolean {
  return record.areas.some((raw) =>
    normalizeAreaInspection(raw, raw.area).advice.includes(label),
  );
}

export function visitPhotoTotal(record: VisitRecord): number {
  return record.areas.reduce(
    (sum, raw) => sum + normalizeAreaInspection(raw, raw.area).photoCount,
    0,
  );
}

export function visitProducts(record: VisitRecord): string[] {
  const set = new Set<string>();
  for (const raw of record.areas) {
    const apps = normalizeTreatment(
      normalizeAreaInspection(raw, raw.area).treatment,
    ).applications;
    for (const app of apps) {
      if (app.product.trim()) set.add(app.product.trim());
    }
  }
  return [...set];
}

export function visitUniqueFindings(record: VisitRecord): string[] {
  const set = new Set<string>();
  for (const raw of record.areas) {
    for (const f of normalizeAreaInspection(raw, raw.area).findings) {
      set.add(f);
    }
  }
  return [...set].sort();
}

export function visitUniquePests(record: VisitRecord): string[] {
  const set = new Set<string>();
  for (const raw of record.areas) {
    for (const p of normalizeAreaInspection(raw, raw.area).pestTypes) {
      set.add(p);
    }
  }
  return [...set].sort();
}

export type VisitTreatmentRow = {
  area: string;
  product: string;
  method: string;
  quantity: string;
};

export function visitTreatmentRows(record: VisitRecord): VisitTreatmentRow[] {
  const rows: VisitTreatmentRow[] = [];
  for (const raw of record.areas) {
    const a = normalizeAreaInspection(raw, raw.area);
    for (const app of normalizeTreatment(a.treatment).applications) {
      if (!app.product.trim()) continue;
      rows.push({
        area: a.area,
        product: app.product,
        method: app.method || "—",
        quantity: app.quantity || "—",
      });
    }
  }
  return rows;
}

export type TreatmentAppRow = {
  id: string;
  recordId: string;
  siteId: string;
  date: string;
  clientName: string;
  siteName: string;
  area: string;
  product: string;
  method: string;
  activeIngredient: string;
  antidote: string;
  quantity: string;
  technicianName: string;
  visitType: VisitRecord["visitType"];
};

/** Flat register of every chemical treatment application across visits */
export function treatmentAppRows(records: VisitRecord[]): TreatmentAppRow[] {
  const rows: TreatmentAppRow[] = [];
  for (const r of records) {
    for (const raw of r.areas) {
      const a = normalizeAreaInspection(raw, raw.area);
      const apps = normalizeTreatment(a.treatment).applications.filter((x) =>
        x.product.trim(),
      );
      apps.forEach((app, idx) => {
        rows.push({
          id: `${r.id}::${a.area}::${idx}`,
          recordId: r.id,
          siteId: r.siteId,
          date: r.date,
          clientName: r.clientName,
          siteName: r.siteName,
          area: a.area,
          product: app.product,
          method: app.method || "—",
          activeIngredient: app.activeIngredient || "—",
          antidote: app.antidote || "—",
          quantity: app.quantity || "—",
          technicianName: r.technicianName,
          visitType: r.visitType,
        });
      });
    }
  }
  return rows.sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      a.clientName.localeCompare(b.clientName) ||
      a.siteName.localeCompare(b.siteName) ||
      a.area.localeCompare(b.area) ||
      a.product.localeCompare(b.product),
  );
}

export function visitTreatmentsCount(record: VisitRecord): number {
  return visitTreatmentRows(record).length;
}

export function visitAdviceFlags(record: VisitRecord): string[] {
  const set = new Set<string>();
  for (const raw of record.areas) {
    for (const tip of normalizeAreaInspection(raw, raw.area).advice) {
      set.add(tip);
    }
  }
  return [...set].sort();
}
