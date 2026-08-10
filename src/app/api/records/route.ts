import { NextResponse } from "next/server";
import {
  jsonError,
  requireJobAccess,
  requireManagerOrAdmin,
  requireSession,
} from "@/lib/api-auth";
import { getJobQuery, listRecordsQuery, upsertRecordQuery } from "@/lib/db/queries";
import type { VisitRecord } from "@/lib/visit-record";

export async function GET() {
  const auth = await requireManagerOrAdmin();
  if (auth.error) return auth.error;
  const records = await listRecordsQuery();
  return NextResponse.json(records);
}

export async function POST(request: Request) {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  try {
    const body = (await request.json()) as VisitRecord;
    const job = await getJobQuery(body.visitId);
    const denied = await requireJobAccess(job, auth.session!);
    if (denied) return denied;
    const record = await upsertRecordQuery(body);
    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save record";
    return jsonError(message);
  }
}
