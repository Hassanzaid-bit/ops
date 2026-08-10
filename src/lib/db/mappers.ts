import type { Client } from "@/lib/clients-store";
import type { ScheduledVisit, Site, VisitDraft } from "@/lib/types";
import type { VisitRecord } from "@/lib/visit-record";
import type { clients, jobs, sites, visitRecords } from "./schema";

type SiteRow = typeof sites.$inferSelect & {
  clientName: string;
  address?: string | null;
};
type JobRow = typeof jobs.$inferSelect;
type ClientRow = typeof clients.$inferSelect;
type RecordRow = typeof visitRecords.$inferSelect;

import { normalizeChecklistAreas } from "@/lib/site-checklist";

export function toSite(row: SiteRow): Site {
  return {
    id: row.id,
    clientName: row.clientName,
    siteName: row.name,
    address: row.address ?? "",
    checklistAreas: normalizeChecklistAreas(row.areas),
  };
}

export function toClient(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    notes: row.notes ?? "",
    createdAt: row.createdAt.toISOString(),
  };
}

export function toScheduledVisit(row: JobRow): ScheduledVisit {
  const mode = row.assignmentMode === "team" ? "team" : "solo";
  const teamMemberIds = Array.isArray(row.teamMemberIds)
    ? row.teamMemberIds.filter(Boolean)
    : [];
  return {
    id: row.id,
    siteId: row.siteId,
    visitType: row.visitType,
    technicianName: row.technicianName,
    technicianId: row.technicianId ?? undefined,
    assignmentMode: mode,
    teamMemberIds,
    date: row.date,
    status: row.status,
    timeWindow: row.timeWindow ?? undefined,
    notes: row.notes ?? undefined,
    followUpAreas: row.followUpAreas ?? undefined,
    parentVisitId: row.parentVisitId ?? undefined,
  };
}

export function toVisitRecord(row: RecordRow): VisitRecord {
  return {
    id: row.id,
    visitId: row.jobId,
    siteId: row.siteId,
    clientName: row.clientName,
    siteName: row.siteName,
    visitType: row.visitType,
    technicianName: row.technicianName,
    date: row.date,
    submittedAt: row.submittedAt.toISOString(),
    areas: row.areas ?? [],
    reportText: row.reportText,
  };
}

export function draftMetaFromJob(row: JobRow): {
  visitId: string;
  updatedAt: string;
  submittedAt?: string;
} | null {
  if (!row.draft) return null;
  const draft = row.draft as VisitDraft;
  return {
    visitId: row.id,
    updatedAt: draft.updatedAt,
    submittedAt: draft.submittedAt,
  };
}
