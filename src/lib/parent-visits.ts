import { listRecords } from "./records-store";
import { listSites, listVisits } from "./ops-store";
import { normalizeAreaInspection } from "./types";
import { VISIT_TYPE_LABELS } from "./vocabulary";

export type ParentVisitOption = {
  id: string;
  siteId: string;
  date: string;
  label: string;
  /** Issue areas from a submitted record, if available */
  issueAreas: string[];
};

/**
 * Candidate original visits for a follow-up: prior full inspections
 * (scheduled jobs + submitted records) for the branch.
 */
export function listParentVisitOptions(opts: {
  siteId?: string;
  excludeVisitId?: string;
}): ParentVisitOption[] {
  const sites = listSites();
  const byId = new Map<string, ParentVisitOption>();

  for (const v of listVisits()) {
    if (v.visitType !== "full_inspection") continue;
    if (opts.excludeVisitId && v.id === opts.excludeVisitId) continue;
    if (opts.siteId && v.siteId !== opts.siteId) continue;
    const site = sites.find((s) => s.id === v.siteId);
    const place = site
      ? `${site.clientName} · ${site.siteName}`
      : "Unknown site";
    byId.set(v.id, {
      id: v.id,
      siteId: v.siteId,
      date: v.date,
      label: `${v.date} · ${place} · ${v.technicianName} · ${VISIT_TYPE_LABELS[v.visitType]}`,
      issueAreas: [],
    });
  }

  for (const r of listRecords()) {
    if (r.visitType !== "full_inspection") continue;
    if (opts.excludeVisitId && r.visitId === opts.excludeVisitId) continue;
    if (opts.siteId && r.siteId !== opts.siteId) continue;
    const issueAreas = r.areas
      .map((a) => normalizeAreaInspection(a, a.area))
      .filter((a) => a.status === "issues")
      .map((a) => a.area);
    const existing = byId.get(r.visitId);
    const place = `${r.clientName} · ${r.siteName}`;
    const label = `${r.date} · ${place} · ${r.technicianName} · submitted`;
    byId.set(r.visitId, {
      id: r.visitId,
      siteId: r.siteId,
      date: r.date,
      label: existing ? `${existing.label} · submitted` : label,
      issueAreas:
        issueAreas.length > 0 ? issueAreas : (existing?.issueAreas ?? []),
    });
  }

  return [...byId.values()].sort(
    (a, b) =>
      b.date.localeCompare(a.date) || a.label.localeCompare(b.label),
  );
}

export function parentVisitLabel(parentVisitId: string): string | null {
  const opt = listParentVisitOptions({}).find((o) => o.id === parentVisitId);
  if (opt) return opt.label;
  const visit = listVisits().find((v) => v.id === parentVisitId);
  if (!visit) return null;
  const site = listSites().find((s) => s.id === visit.siteId);
  return `${visit.date} · ${site ? `${site.clientName} · ${site.siteName}` : "Visit"} · ${visit.technicianName}`;
}
