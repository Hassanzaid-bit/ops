import { NextResponse } from "next/server";
import {
  jobScope,
  jsonError,
  requireJobAccess,
  requireManagerOrAdmin,
  requireSession,
} from "@/lib/api-auth";
import {
  deleteJobQuery,
  getJobQuery,
  saveJobQuery,
} from "@/lib/db/queries";
import type { ScheduledVisit } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  const { id } = await params;
  const job = await getJobQuery(id);
  const denied = await requireJobAccess(job, auth.session!);
  if (denied) return denied;
  return NextResponse.json(job);
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireManagerOrAdmin();
  if (auth.error) return auth.error;
  const { id } = await params;
  const existing = await getJobQuery(id);
  if (!existing) return jsonError("Job not found", 404);
  try {
    const body = (await request.json()) as Partial<ScheduledVisit>;
    const job = await saveJobQuery({ ...existing, ...body, id });
    return NextResponse.json(job);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update job";
    return jsonError(message);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireManagerOrAdmin();
  if (auth.error) return auth.error;
  const { id } = await params;
  await deleteJobQuery(id);
  return new NextResponse(null, { status: 204 });
}
