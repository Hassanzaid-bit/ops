import "server-only";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import type { SessionUser, UserRole } from "@/lib/auth-types";
import { isAdmin, isManagerOrAdmin } from "@/lib/permissions";

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    return {
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { session, error: null };
}

export async function requireAdmin() {
  const auth = await requireSession();
  if (auth.error) return auth;
  if (!isAdmin(auth.session!.role)) {
    return {
      session: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return auth;
}

export async function requireManagerOrAdmin() {
  const auth = await requireSession();
  if (auth.error) return auth;
  if (!isManagerOrAdmin(auth.session!.role)) {
    return {
      session: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return auth;
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function toPublicUser(row: {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
}) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
  };
}

export function jobScope(session: SessionUser) {
  return {
    role: session.role,
    userId: session.id,
    userName: session.name,
  };
}

export async function requireJobAccess(
  job: {
    technicianId?: string | null;
    technicianName: string;
    teamMemberIds?: string[] | null;
    assignmentMode?: string | null;
  } | null,
  session: SessionUser,
) {
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  if (session.role === "technician") {
    const { jobAssignedToUser } = await import("@/lib/permissions");
    if (!jobAssignedToUser(job, session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }
  return null;
}
