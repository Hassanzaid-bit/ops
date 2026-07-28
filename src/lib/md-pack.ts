/**
 * Managing Director dashboard pack — rollups from schema v2 inspection points.
 */
import {
  actionTierLabel,
  conduciveLabel,
  pestTypeLabel,
  type ActionTier,
  type ConduciveType,
  type ThresholdLevel,
} from "./ipm";
import { normalizeAreaInspection, type InspectionPoint } from "./types";
import type { VisitRecord } from "./visit-record";

export type PointFact = {
  recordId: string;
  visitId: string;
  date: string;
  clientName: string;
  siteName: string;
  siteId: string;
  area: string;
  pointId: string;
  pointLabel: string;
  outcome: "clean" | "issue";
  thresholdLevel: ThresholdLevel;
  pestType: string;
  evidence: string;
  conduciveType: ConduciveType;
  conduciveLabel: string;
  actionTier: ActionTier;
  note: string;
  recommendation: string;
};

const THRESHOLD_RANK: Record<ThresholdLevel, number> = {
  none: 0,
  light: 1,
  moderate: 2,
  heavy: 3,
};

export function toPointFacts(records: VisitRecord[]): PointFact[] {
  const rows: PointFact[] = [];
  for (const r of records) {
    for (const raw of r.areas) {
      const a = normalizeAreaInspection(raw, raw.area);
      for (const p of a.points) {
        if (p.outcome === null) continue;
        rows.push({
          recordId: r.id,
          visitId: r.visitId,
          date: r.date,
          clientName: r.clientName,
          siteName: r.siteName,
          siteId: r.siteId,
          area: a.area,
          pointId: p.pointId,
          pointLabel: p.label,
          outcome: p.outcome,
          thresholdLevel: p.thresholdLevel,
          pestType: pestTypeLabel(p.identification.pestType),
          evidence: p.identification.evidence?.replace(/_/g, " ") ?? "",
          conduciveType: p.conduciveCondition.present
            ? p.conduciveCondition.type
            : null,
          conduciveLabel: p.conduciveCondition.present
            ? conduciveLabel(p.conduciveCondition.type)
            : "",
          actionTier: p.actionTier,
          note: p.note,
          recommendation: a.recommendation || a.advice[0] || "",
        });
      }
    }
  }
  return rows;
}

export function issuePointFacts(points: PointFact[]): PointFact[] {
  return points.filter((p) => p.outcome === "issue");
}

export type MdPackKpis = {
  issuePoints: number;
  moderateOrHeavy: number;
  escalations: number;
  conduciveFlags: number;
  targetedTreatments: number;
  exclusionSanitation: number;
};

export function mdPackKpis(points: PointFact[]): MdPackKpis {
  const issues = issuePointFacts(points);
  return {
    issuePoints: issues.length,
    moderateOrHeavy: issues.filter(
      (p) => p.thresholdLevel === "moderate" || p.thresholdLevel === "heavy",
    ).length,
    escalations: issues.filter((p) => p.actionTier === "escalation").length,
    conduciveFlags: issues.filter((p) => Boolean(p.conduciveType)).length,
    targetedTreatments: issues.filter(
      (p) => p.actionTier === "targeted_treatment",
    ).length,
    exclusionSanitation: issues.filter(
      (p) => p.actionTier === "exclusion_sanitation",
    ).length,
  };
}

export type SiteSeverityRow = {
  siteId: string;
  clientName: string;
  siteName: string;
  visits: number;
  issuePoints: number;
  light: number;
  moderate: number;
  heavy: number;
  maxThreshold: ThresholdLevel;
  lastDate: string;
};

export function siteSeverityRows(records: VisitRecord[]): SiteSeverityRow[] {
  const map = new Map<
    string,
    {
      siteId: string;
      clientName: string;
      siteName: string;
      visitIds: Set<string>;
      issuePoints: number;
      light: number;
      moderate: number;
      heavy: number;
      maxThreshold: ThresholdLevel;
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
        issuePoints: 0,
        light: 0,
        moderate: 0,
        heavy: 0,
        maxThreshold: "none",
        lastDate: r.date,
      };
      map.set(r.siteId, row);
    }
    row.visitIds.add(r.visitId);
    if (r.date > row.lastDate) row.lastDate = r.date;

    for (const raw of r.areas) {
      const a = normalizeAreaInspection(raw, raw.area);
      for (const p of a.points) {
        if (p.outcome !== "issue") continue;
        row.issuePoints += 1;
        if (p.thresholdLevel === "light") row.light += 1;
        if (p.thresholdLevel === "moderate") row.moderate += 1;
        if (p.thresholdLevel === "heavy") row.heavy += 1;
        if (THRESHOLD_RANK[p.thresholdLevel] > THRESHOLD_RANK[row.maxThreshold]) {
          row.maxThreshold = p.thresholdLevel;
        }
      }
    }
  }

  return [...map.values()]
    .map((row) => ({
      siteId: row.siteId,
      clientName: row.clientName,
      siteName: row.siteName,
      visits: row.visitIds.size,
      issuePoints: row.issuePoints,
      light: row.light,
      moderate: row.moderate,
      heavy: row.heavy,
      maxThreshold: row.maxThreshold,
      lastDate: row.lastDate,
    }))
    .sort(
      (a, b) =>
        THRESHOLD_RANK[b.maxThreshold] - THRESHOLD_RANK[a.maxThreshold] ||
        b.heavy - a.heavy ||
        b.moderate - a.moderate ||
        b.issuePoints - a.issuePoints,
    );
}

export type ConduciveRollup = {
  type: Exclude<ConduciveType, null>;
  label: string;
  count: number;
  sites: number;
  lastDate: string;
};

export function conduciveRollups(points: PointFact[]): ConduciveRollup[] {
  const map = new Map<
    string,
    {
      type: Exclude<ConduciveType, null>;
      label: string;
      count: number;
      sites: Set<string>;
      lastDate: string;
    }
  >();

  for (const p of issuePointFacts(points)) {
    if (!p.conduciveType) continue;
    let row = map.get(p.conduciveType);
    if (!row) {
      row = {
        type: p.conduciveType,
        label: p.conduciveLabel || conduciveLabel(p.conduciveType),
        count: 0,
        sites: new Set(),
        lastDate: p.date,
      };
      map.set(p.conduciveType, row);
    }
    row.count += 1;
    row.sites.add(p.siteId);
    if (p.date > row.lastDate) row.lastDate = p.date;
  }

  return [...map.values()]
    .map((row) => ({
      type: row.type,
      label: row.label,
      count: row.count,
      sites: row.sites.size,
      lastDate: row.lastDate,
    }))
    .sort((a, b) => b.count - a.count);
}

export type ActionTierRollup = {
  tier: ActionTier;
  label: string;
  count: number;
  lastDate: string;
};

export function actionTierRollups(points: PointFact[]): ActionTierRollup[] {
  const map = new Map<ActionTier, ActionTierRollup>();
  for (const p of issuePointFacts(points)) {
    let row = map.get(p.actionTier);
    if (!row) {
      row = {
        tier: p.actionTier,
        label: actionTierLabel(p.actionTier),
        count: 0,
        lastDate: p.date,
      };
      map.set(p.actionTier, row);
    }
    row.count += 1;
    if (p.date > row.lastDate) row.lastDate = p.date;
  }
  const order: ActionTier[] = [
    "escalation",
    "targeted_treatment",
    "exclusion_sanitation",
    "monitor",
  ];
  return order
    .map((tier) => map.get(tier))
    .filter((r): r is ActionTierRollup => Boolean(r));
}

export type EscalationRow = {
  id: string;
  date: string;
  clientName: string;
  siteName: string;
  siteId: string;
  area: string;
  pointLabel: string;
  thresholdLevel: ThresholdLevel;
  pestType: string;
  conduciveLabel: string;
  actionTier: ActionTier;
  recommendation: string;
};

/** Heavy threshold or escalation action tier — supervisor / MD queue */
export function escalationQueue(points: PointFact[]): EscalationRow[] {
  return issuePointFacts(points)
    .filter(
      (p) =>
        p.actionTier === "escalation" || p.thresholdLevel === "heavy",
    )
    .map((p) => ({
      id: `${p.recordId}::${p.area}::${p.pointId}`,
      date: p.date,
      clientName: p.clientName,
      siteName: p.siteName,
      siteId: p.siteId,
      area: p.area,
      pointLabel: p.pointLabel,
      thresholdLevel: p.thresholdLevel,
      pestType: p.pestType,
      conduciveLabel: p.conduciveLabel,
      actionTier: p.actionTier,
      recommendation: p.recommendation,
    }))
    .sort(
      (a, b) =>
        THRESHOLD_RANK[b.thresholdLevel] - THRESHOLD_RANK[a.thresholdLevel] ||
        b.date.localeCompare(a.date),
    );
}

export function pointsForConducive(
  points: PointFact[],
  type: Exclude<ConduciveType, null>,
): PointFact[] {
  return issuePointFacts(points)
    .filter((p) => p.conduciveType === type)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function pointsForSite(points: PointFact[], siteId: string): PointFact[] {
  return issuePointFacts(points)
    .filter((p) => p.siteId === siteId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Helper for seed / tests — patch a point on an area */
export function issuePointPatch(
  partial: Partial<InspectionPoint> & Pick<InspectionPoint, "pointId" | "label">,
): InspectionPoint {
  return {
    pointId: partial.pointId,
    label: partial.label,
    outcome: partial.outcome ?? "issue",
    identification: partial.identification ?? {
      pestType: null,
      evidence: null,
    },
    thresholdLevel: partial.thresholdLevel ?? "light",
    conduciveCondition: partial.conduciveCondition ?? {
      present: false,
      type: null,
    },
    actionTier: partial.actionTier ?? "monitor",
    note: partial.note ?? "",
    photoCount: partial.photoCount ?? 0,
    phraseClean: partial.phraseClean ?? "",
    phraseIssue: partial.phraseIssue ?? "",
  };
}
