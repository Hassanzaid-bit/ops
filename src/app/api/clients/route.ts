import { NextResponse } from "next/server";
import { requireManagerOrAdmin, requireSession } from "@/lib/api-auth";
import {
  createClientQuery,
  listClientsQuery,
} from "@/lib/db/queries";

export async function GET() {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  const clients = await listClientsQuery();
  return NextResponse.json(clients);
}

export async function POST(request: Request) {
  const auth = await requireManagerOrAdmin();
  if (auth.error) return auth.error;
  try {
    const body = await request.json();
    const client = await createClientQuery(body);
    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create client";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
