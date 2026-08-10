import { NextResponse } from "next/server";
import { jobScope, requireSession } from "@/lib/api-auth";
import { listDraftMetaQuery } from "@/lib/db/queries";

export async function GET() {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  const meta = await listDraftMetaQuery(jobScope(auth.session!));
  return NextResponse.json(meta);
}
