import { NextResponse } from "next/server";
import { jsonError, requireSession } from "@/lib/api-auth";
import { getRecordQuery } from "@/lib/db/queries";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  const { id } = await params;
  const record = await getRecordQuery(id);
  if (!record) return jsonError("Record not found", 404);
  return NextResponse.json(record);
}
