import "server-only";

import { and, asc, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import type { UserRole } from "@/lib/auth-types";
import type { Client, CreateClientInput } from "@/lib/clients-store";
import type {
  CreateUserInput,
  UpdateUserInput,
} from "@/lib/permissions";
import type { ScheduledVisit, Site, VisitDraft } from "@/lib/types";
import { normalizeJobAssignment } from "@/lib/types";
import type { VisitRecord } from "@/lib/visit-record";
import { db } from "./index";
import {
  draftMetaFromJob,
  toClient,
  toScheduledVisit,
  toSite,
  toVisitRecord,
} from "./mappers";
import { clients, jobs, sites, users, visitRecords } from "./schema";
import {
  normalizeLogin,
  normalizeUsername,
  validateUsername,
} from "@/lib/user-credentials";

export async function findUserByEmail(email: string) {
  const normalized = normalizeLogin(email);
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, normalized))
    .limit(1);
  return rows[0] ?? null;
}

export async function findUserByUsername(username: string) {
  const normalized = normalizeUsername(username);
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.username, normalized))
    .limit(1);
  return rows[0] ?? null;
}

export async function findUserByLogin(login: string) {
  const normalized = normalizeLogin(login);
  if (!normalized) return null;

  if (normalized.includes("@")) {
    return findUserByEmail(normalized);
  }

  const rows = await db
    .select()
    .from(users)
    .where(
      or(eq(users.username, normalized), eq(users.email, normalized)),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function verifyUserPassword(login: string, password: string) {
  const user = await findUserByLogin(login);
  if (!user || !user.isActive) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? user : null;
}

export type PublicUser = {
  id: string;
  email: string;
  username: string | null;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
};

function toPublicUser(row: {
  id: string;
  email: string;
  username: string | null;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
}): PublicUser {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    name: row.name,
    role: row.role,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
  };
}

const publicUserFields = {
  id: users.id,
  email: users.email,
  username: users.username,
  name: users.name,
  role: users.role,
  isActive: users.isActive,
  createdAt: users.createdAt,
};

export async function listUsersQuery(role?: UserRole): Promise<PublicUser[]> {
  const rows = role
    ? await db
        .select(publicUserFields)
        .from(users)
        .where(eq(users.role, role))
        .orderBy(asc(users.name))
    : await db
        .select(publicUserFields)
        .from(users)
        .orderBy(asc(users.name));
  return rows.map(toPublicUser);
}

export async function getUserQuery(id: string): Promise<PublicUser | null> {
  const rows = await db
    .select(publicUserFields)
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return rows[0] ? toPublicUser(rows[0]) : null;
}

export async function createUserQuery(
  input: CreateUserInput,
): Promise<PublicUser> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const username = validateUsername(input.username);
  if (!name) throw new Error("Name is required");
  if (!email) throw new Error("Email is required");
  if (!input.password) throw new Error("Password is required");

  const existingEmail = await findUserByEmail(email);
  if (existingEmail) throw new Error("A user with that email already exists");

  const existingUsername = await findUserByUsername(username);
  if (existingUsername) {
    throw new Error("A user with that username already exists");
  }

  const id = `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const passwordHash = await bcrypt.hash(input.password, 10);

  await db.insert(users).values({
    id,
    email,
    username,
    name,
    passwordHash,
    role: input.role,
    isActive: true,
  });

  return (await getUserQuery(id))!;
}

export async function updateUserQuery(
  id: string,
  input: UpdateUserInput,
): Promise<PublicUser> {
  const existing = await getUserQuery(id);
  if (!existing) throw new Error("User not found");

  const patch: {
    name?: string;
    username?: string;
    role?: UserRole;
    isActive?: boolean;
    passwordHash?: string;
    updatedAt: Date;
  } = { updatedAt: new Date() };

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new Error("Name is required");
    patch.name = name;
  }
  if (input.username !== undefined) {
    const username = validateUsername(input.username);
    const taken = await findUserByUsername(username);
    if (taken && taken.id !== id) {
      throw new Error("A user with that username already exists");
    }
    patch.username = username;
  }
  if (input.role !== undefined) patch.role = input.role;
  if (input.isActive !== undefined) patch.isActive = input.isActive;
  if (input.password) {
    patch.passwordHash = await bcrypt.hash(input.password, 10);
  }

  await db.update(users).set(patch).where(eq(users.id, id));
  return (await getUserQuery(id))!;
}

type JobScope = {
  role: UserRole;
  userId: string;
  userName: string;
};

function technicianJobFilter(scope: JobScope) {
  return or(
    eq(jobs.technicianId, scope.userId),
    sql`coalesce(${jobs.teamMemberIds}, '[]'::jsonb) @> ${JSON.stringify([scope.userId])}::jsonb`,
    and(
      isNull(jobs.technicianId),
      sql`lower(${jobs.technicianName}) = lower(${scope.userName})`,
    ),
  );
}

async function siteRows() {
  return db
    .select({
      id: sites.id,
      clientId: sites.clientId,
      name: sites.name,
      address: sites.address,
      areas: sites.areas,
      createdAt: sites.createdAt,
      updatedAt: sites.updatedAt,
      clientName: clients.name,
    })
    .from(sites)
    .innerJoin(clients, eq(sites.clientId, clients.id))
    .orderBy(asc(clients.name), asc(sites.name));
}

export async function listSitesQuery(): Promise<Site[]> {
  const rows = await siteRows();
  return rows.map(toSite);
}

export async function getSiteQuery(siteId: string): Promise<Site | null> {
  const rows = await db
    .select({
      id: sites.id,
      clientId: sites.clientId,
      name: sites.name,
      address: sites.address,
      areas: sites.areas,
      createdAt: sites.createdAt,
      updatedAt: sites.updatedAt,
      clientName: clients.name,
    })
    .from(sites)
    .innerJoin(clients, eq(sites.clientId, clients.id))
    .where(eq(sites.id, siteId))
    .limit(1);
  return rows[0] ? toSite(rows[0]) : null;
}

export async function saveSiteQuery(site: Site): Promise<Site> {
  const clientRows = await db
    .select()
    .from(clients)
    .where(ilike(clients.name, site.clientName.trim()))
    .limit(1);

  let clientId = clientRows[0]?.id;
  if (!clientId) {
    clientId = `client-${Date.now().toString(36)}`;
    await db.insert(clients).values({
      id: clientId,
      name: site.clientName.trim(),
      notes: "",
    });
  }

  const existing = await db
    .select()
    .from(sites)
    .where(eq(sites.id, site.id))
    .limit(1);

  if (existing[0]) {
    await db
      .update(sites)
      .set({
        clientId,
        name: site.siteName.trim(),
        address: site.address.trim(),
        areas: site.checklistAreas,
        updatedAt: new Date(),
      })
      .where(eq(sites.id, site.id));
  } else {
    await db.insert(sites).values({
      id: site.id,
      clientId,
      name: site.siteName.trim(),
      address: site.address.trim(),
      areas: site.checklistAreas,
    });
  }

  return (await getSiteQuery(site.id))!;
}

export async function deleteSiteQuery(siteId: string): Promise<void> {
  await db.delete(jobs).where(eq(jobs.siteId, siteId));
  await db.delete(sites).where(eq(sites.id, siteId));
}

export async function listClientsQuery(): Promise<Client[]> {
  const rows = await db.select().from(clients).orderBy(asc(clients.name));
  return rows.map(toClient);
}

export async function getClientQuery(id: string): Promise<Client | null> {
  const rows = await db
    .select()
    .from(clients)
    .where(eq(clients.id, id))
    .limit(1);
  return rows[0] ? toClient(rows[0]) : null;
}

export async function saveClientQuery(client: Client): Promise<Client> {
  const name = client.name.trim();
  const duplicate = await db
    .select()
    .from(clients)
    .where(ilike(clients.name, name))
    .limit(1);

  if (duplicate[0] && duplicate[0].id !== client.id) {
    throw new Error("A client with that name already exists");
  }

  const existing = await getClientQuery(client.id);
  if (existing) {
    await db
      .update(clients)
      .set({ name, notes: client.notes.trim() })
      .where(eq(clients.id, client.id));

    if (existing.name !== name) {
      const siteList = await listSitesQuery();
      for (const site of siteList.filter((s) => s.clientName === existing.name)) {
        await saveSiteQuery({ ...site, clientName: name });
      }
    }
  } else {
    await db.insert(clients).values({
      id: client.id,
      name,
      notes: client.notes.trim(),
    });
  }

  return (await getClientQuery(client.id))!;
}

export async function createClientQuery(
  input: CreateClientInput,
): Promise<Client> {
  const name = input.name.trim();
  if (!name) throw new Error("Client name is required");

  const client: Client = {
    id: `client-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    notes: (input.notes ?? "").trim(),
    createdAt: new Date().toISOString(),
  };
  await saveClientQuery(client);

  const branch = input.firstBranch?.trim();
  if (branch) {
    await saveSiteQuery({
      id: `site-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      clientName: client.name,
      siteName: branch,
      address: "",
      checklistAreas: [],
    });
  }

  return client;
}

export async function deleteClientQuery(id: string): Promise<void> {
  const client = await getClientQuery(id);
  if (!client) return;

  const siteList = await listSitesQuery();
  const branches = siteList.filter((s) => s.clientName === client.name);
  if (branches.length > 0) {
    throw new Error(
      "Remove or reassign this client's branches in Jobs before deleting.",
    );
  }
  await db.delete(clients).where(eq(clients.id, id));
}

export async function listJobsQuery(
  date?: string,
  scope?: JobScope,
): Promise<ScheduledVisit[]> {
  const filters = [];
  if (date) filters.push(eq(jobs.date, date));
  if (scope?.role === "technician") {
    filters.push(technicianJobFilter(scope));
  }

  const where =
    filters.length === 0
      ? undefined
      : filters.length === 1
        ? filters[0]
        : and(...filters);

  const rows = where
    ? await db
        .select()
        .from(jobs)
        .where(where)
        .orderBy(date ? asc(jobs.timeWindow) : desc(jobs.date))
    : await db.select().from(jobs).orderBy(desc(jobs.date));
  return rows.map(toScheduledVisit);
}

export async function getJobQuery(id: string): Promise<ScheduledVisit | null> {
  const rows = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  return rows[0] ? toScheduledVisit(rows[0]) : null;
}

export async function saveJobQuery(visit: ScheduledVisit): Promise<ScheduledVisit> {
  const normalized = normalizeJobAssignment(visit);
  if (!normalized.technicianName.trim()) {
    throw new Error("Lead technician is required");
  }
  if (!normalized.technicianId) {
    throw new Error("Lead technician is required");
  }
  if (normalized.assignmentMode === "team") {
    if ((normalized.teamMemberIds?.length ?? 0) < 2) {
      throw new Error("Team jobs need at least two PMPs");
    }
    if (!normalized.teamMemberIds!.includes(normalized.technicianId)) {
      throw new Error("Lead must be included in the team");
    }
  }

  const existing = await getJobQuery(visit.id);
  const payload = {
    siteId: normalized.siteId,
    technicianName: normalized.technicianName.trim(),
    technicianId: normalized.technicianId,
    assignmentMode: normalized.assignmentMode ?? "solo",
    teamMemberIds:
      normalized.assignmentMode === "team" ? (normalized.teamMemberIds ?? []) : [],
    visitType: normalized.visitType,
    date: normalized.date,
    status: normalized.status,
    timeWindow: normalized.timeWindow ?? null,
    notes: normalized.notes ?? null,
    followUpAreas: normalized.followUpAreas ?? null,
    parentVisitId: normalized.parentVisitId ?? null,
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(jobs).set(payload).where(eq(jobs.id, visit.id));
  } else {
    await db.insert(jobs).values({ id: visit.id, ...payload });
  }

  return (await getJobQuery(visit.id))!;
}

export async function deleteJobQuery(id: string): Promise<void> {
  await db.delete(jobs).where(eq(jobs.id, id));
}

export async function getDraftQuery(
  visitId: string,
): Promise<VisitDraft | null> {
  const rows = await db
    .select({ draft: jobs.draft })
    .from(jobs)
    .where(eq(jobs.id, visitId))
    .limit(1);
  return rows[0]?.draft ?? null;
}

export async function saveDraftQuery(draft: VisitDraft): Promise<void> {
  const next = { ...draft, updatedAt: new Date().toISOString() };
  await db
    .update(jobs)
    .set({ draft: next, status: "in_progress", updatedAt: new Date() })
    .where(eq(jobs.id, draft.visitId));
}

export async function clearDraftQuery(visitId: string): Promise<void> {
  await db
    .update(jobs)
    .set({ draft: null, updatedAt: new Date() })
    .where(eq(jobs.id, visitId));
}

export async function listDraftMetaQuery(
  scope?: JobScope,
): Promise<{ visitId: string; updatedAt: string; submittedAt?: string }[]> {
  const rows =
    scope?.role === "technician"
      ? await db
          .select()
          .from(jobs)
          .where(technicianJobFilter(scope))
      : await db.select().from(jobs);
  return rows
    .map(draftMetaFromJob)
    .filter((m): m is NonNullable<typeof m> => m !== null);
}

export async function listRecordsQuery(): Promise<VisitRecord[]> {
  const rows = await db
    .select()
    .from(visitRecords)
    .orderBy(desc(visitRecords.date));
  return rows.map(toVisitRecord);
}

export async function getRecordQuery(id: string): Promise<VisitRecord | null> {
  const rows = await db
    .select()
    .from(visitRecords)
    .where(eq(visitRecords.id, id))
    .limit(1);
  return rows[0] ? toVisitRecord(rows[0]) : null;
}

export async function upsertRecordQuery(record: VisitRecord): Promise<VisitRecord> {
  const submitId = `${record.visitId}:${record.date}`;
  const existing = await db
    .select()
    .from(visitRecords)
    .where(eq(visitRecords.jobId, record.visitId))
    .limit(1);

  const payload = {
    jobId: record.visitId,
    siteId: record.siteId,
    clientName: record.clientName,
    siteName: record.siteName,
    visitType: record.visitType,
    technicianName: record.technicianName,
    date: record.date,
    submittedAt: new Date(record.submittedAt),
    areas: record.areas,
    reportText: record.reportText,
    submitId,
  };

  if (existing[0]) {
    await db
      .update(visitRecords)
      .set(payload)
      .where(eq(visitRecords.id, existing[0].id));
    await db
      .update(jobs)
      .set({ status: "submitted", draft: null, updatedAt: new Date() })
      .where(eq(jobs.id, record.visitId));
    return (await getRecordQuery(existing[0].id))!;
  }

  await db.insert(visitRecords).values({ id: record.id, ...payload });
  await db
    .update(jobs)
    .set({ status: "submitted", draft: null, updatedAt: new Date() })
    .where(eq(jobs.id, record.visitId));
  return (await getRecordQuery(record.id))!;
}

export async function countUsers(): Promise<number> {
  const rows = await db.select({ id: users.id }).from(users).limit(1);
  return rows.length;
}
