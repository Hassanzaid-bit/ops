import {
  boolean,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { AreaInspection, VisitDraft } from "@/lib/types";
import type { ChecklistArea } from "@/lib/site-checklist";

export const userRoleEnum = pgEnum("user_role", [
  "technician",
  "manager",
  "admin",
]);

export const visitTypeEnum = pgEnum("visit_type", [
  "full_inspection",
  "follow_up",
]);

export const jobStatusEnum = pgEnum("job_status", [
  "scheduled",
  "in_progress",
  "submitted",
]);

export const assignmentModeEnum = pgEnum("assignment_mode", ["solo", "team"]);

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    username: text("username"),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("users_email_idx").on(table.email),
    uniqueIndex("users_username_idx").on(table.username),
  ],
);

export const clients = pgTable(
  "clients",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("clients_name_idx").on(table.name)],
);

export const sites = pgTable("sites", {
  id: text("id").primaryKey(),
  clientId: text("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  address: text("address").notNull().default(""),
  /** Checklist area tree; DB column name kept for existing rows */
  areas: jsonb("areas").$type<ChecklistArea[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const jobs = pgTable("jobs", {
  id: text("id").primaryKey(),
  siteId: text("site_id")
    .notNull()
    .references(() => sites.id, { onDelete: "cascade" }),
  technicianId: text("technician_id").references(() => users.id),
  technicianName: text("technician_name").notNull(),
  /** solo = lead only; team = lead + teamMemberIds */
  assignmentMode: assignmentModeEnum("assignment_mode")
    .notNull()
    .default("solo"),
  /** User ids on the job (includes lead). Empty for legacy solo rows. */
  teamMemberIds: jsonb("team_member_ids").$type<string[]>().notNull().default([]),
  visitType: visitTypeEnum("visit_type").notNull(),
  date: text("date").notNull(),
  status: jobStatusEnum("status").notNull(),
  timeWindow: text("time_window"),
  notes: text("notes"),
  followUpAreas: jsonb("follow_up_areas").$type<string[]>(),
  parentVisitId: text("parent_visit_id"),
  draft: jsonb("draft").$type<VisitDraft>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const visitRecords = pgTable(
  "visit_records",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    siteId: text("site_id").notNull(),
    clientName: text("client_name").notNull(),
    siteName: text("site_name").notNull(),
    visitType: visitTypeEnum("visit_type").notNull(),
    technicianName: text("technician_name").notNull(),
    date: text("date").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull(),
    areas: jsonb("areas").$type<AreaInspection[]>().notNull(),
    reportText: text("report_text").notNull(),
    submitId: text("submit_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("visit_records_job_id_idx").on(table.jobId),
    uniqueIndex("visit_records_submit_id_idx").on(table.submitId),
  ],
);
