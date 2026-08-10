import { NextResponse } from "next/server";
import { jsonError, requireManagerOrAdmin, requireSession } from "@/lib/api-auth";
import {
  deleteClientQuery,
  getClientQuery,
  saveClientQuery,
} from "@/lib/db/queries";
import type { Client } from "@/lib/clients-store";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  const { id } = await params;
  const client = await getClientQuery(id);
  if (!client) return jsonError("Client not found", 404);
  return NextResponse.json(client);
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireManagerOrAdmin();
  if (auth.error) return auth.error;
  const { id } = await params;
  const existing = await getClientQuery(id);
  if (!existing) return jsonError("Client not found", 404);
  try {
    const body = (await request.json()) as Partial<Client>;
    const client = await saveClientQuery({ ...existing, ...body, id });
    return NextResponse.json(client);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update client";
    return jsonError(message);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireManagerOrAdmin();
  if (auth.error) return auth.error;
  const { id } = await params;
  try {
    await deleteClientQuery(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete client";
    return jsonError(message);
  }
}
