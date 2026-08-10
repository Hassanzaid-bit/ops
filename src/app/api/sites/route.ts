import { NextResponse } from "next/server";
import { requireManagerOrAdmin, requireSession } from "@/lib/api-auth";
import { listSitesQuery, saveSiteQuery } from "@/lib/db/queries";
import type { Site } from "@/lib/types";

export async function GET() {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  const sites = await listSitesQuery();
  return NextResponse.json(sites);
}

export async function POST(request: Request) {
  const auth = await requireManagerOrAdmin();
  if (auth.error) return auth.error;
  try {
    const body = (await request.json()) as Site;
    const site = await saveSiteQuery(body);
    return NextResponse.json(site, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save site";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
