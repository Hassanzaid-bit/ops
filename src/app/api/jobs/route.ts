import { NextResponse } from "next/server";
import {
  jobScope,
  jsonError,
  requireJobAccess,
  requireManagerOrAdmin,
  requireSession,
} from "@/lib/api-auth";
import { listJobsQuery, saveJobQuery } from "@/lib/db/queries";
import type { ScheduledVisit } from "@/lib/types";

export async function GET(request: Request) {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  const date = new URL(request.url).searchParams.get("date") ?? undefined;
  const jobs = await listJobsQuery(date, jobScope(auth.session!));
  return NextResponse.json(jobs);
}

export async function POST(request: Request) {
  const auth = await requireManagerOrAdmin();
  if (auth.error) return auth.error;
  try {
    const body = (await request.json()) as ScheduledVisit;
    const job = await saveJobQuery(body);
    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save job";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
