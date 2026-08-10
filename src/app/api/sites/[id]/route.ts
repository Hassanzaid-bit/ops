import { NextResponse } from "next/server";
import { jsonError, requireManagerOrAdmin, requireSession } from "@/lib/api-auth";
import {
  deleteSiteQuery,
  getSiteQuery,
  saveSiteQuery,
} from "@/lib/db/queries";
import type { Site } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  const { id } = await params;
  const site = await getSiteQuery(id);
  if (!site) return jsonError("Site not found", 404);
  return NextResponse.json(site);
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireManagerOrAdmin();
  if (auth.error) return auth.error;
  const { id } = await params;
  const existing = await getSiteQuery(id);
  if (!existing) return jsonError("Site not found", 404);
  try {
    const body = (await request.json()) as Partial<Site>;
    const site = await saveSiteQuery({ ...existing, ...body, id });
    return NextResponse.json(site);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update site";
    return jsonError(message);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireManagerOrAdmin();
  if (auth.error) return auth.error;
  const { id } = await params;
  await deleteSiteQuery(id);
  return new NextResponse(null, { status: 204 });
}
