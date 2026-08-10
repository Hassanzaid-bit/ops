import { NextResponse } from "next/server";
import {
  jsonError,
  requireAdmin,
  requireManagerOrAdmin,
  requireSession,
} from "@/lib/api-auth";
import type { UserRole } from "@/lib/auth-types";
import {
  createUserQuery,
  listUsersQuery,
} from "@/lib/db/queries";
import type { CreateUserInput } from "@/lib/permissions";

export async function GET(request: Request) {
  const roleParam = new URL(request.url).searchParams.get("role") as
    | UserRole
    | null;

  if (roleParam === "technician") {
    const auth = await requireManagerOrAdmin();
    if (auth.error) return auth.error;
    const users = await listUsersQuery("technician");
    return NextResponse.json(users.filter((u) => u.isActive));
  }

  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const users = await listUsersQuery();
  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  try {
    const body = (await request.json()) as CreateUserInput;
    const user = await createUserQuery(body);
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create user";
    return jsonError(message);
  }
}
