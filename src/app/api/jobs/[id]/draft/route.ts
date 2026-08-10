import { NextResponse } from "next/server";
import {
  jsonError,
  requireJobAccess,
  requireSession,
} from "@/lib/api-auth";
import {
  clearDraftQuery,
  getDraftQuery,
  getJobQuery,
  saveDraftQuery,
} from "@/lib/db/queries";
import type { VisitDraft } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  const { id } = await params;
  const job = await getJobQuery(id);
  const denied = await requireJobAccess(job, auth.session!);
  if (denied) return denied;
  const draft = await getDraftQuery(id);
  return NextResponse.json(draft);
}

export async function PUT(request: Request, { params }: Params) {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  const { id } = await params;
  const job = await getJobQuery(id);
  const denied = await requireJobAccess(job, auth.session!);
  if (denied) return denied;
  try {
    const body = (await request.json()) as VisitDraft;
    if (body.visitId !== id) {
      return jsonError("Draft visitId mismatch");
    }
    await saveDraftQuery(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save draft";
    return jsonError(message);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  const { id } = await params;
  const job = await getJobQuery(id);
  const denied = await requireJobAccess(job, auth.session!);
  if (denied) return denied;
  await clearDraftQuery(id);
  return new NextResponse(null, { status: 204 });
}
