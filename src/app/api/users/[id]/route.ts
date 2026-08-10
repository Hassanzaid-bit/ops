import { NextResponse } from "next/server";
import { jsonError, requireAdmin } from "@/lib/api-auth";
import { updateUserQuery } from "@/lib/db/queries";
import type { UpdateUserInput } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { id } = await params;
  try {
    const body = (await request.json()) as UpdateUserInput;
    const user = await updateUserQuery(id, body);
    return NextResponse.json(user);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update user";
    if (message === "User not found") return jsonError(message, 404);
    return jsonError(message);
  }
}
