import { config } from "dotenv";
import fs from "fs";
import path from "path";

config({ path: ".env.local" });
config({ path: ".env" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, ilike } from "drizzle-orm";
import { createKfcChecklist } from "../src/lib/kfc-checklist-template";
import { clients, sites } from "../src/lib/db/schema";

type BranchRow = { name: string; address: string };

type ImportData = {
  client: string;
  country: string;
  branches: BranchRow[];
};

function branchSlug(name: string): string {
  return name
    .replace(/^KFC\s+/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Add it to .env first.");
    process.exit(1);
  }

  const dataPath = path.join(__dirname, "data", "kfc-uganda-branches.json");
  const data = JSON.parse(fs.readFileSync(dataPath, "utf8")) as ImportData;

  const db = drizzle(neon(url));
  const clientName = data.client.trim();
  const notes = `Imported from Insectram (${data.country}, Jul 2026 reports).`;

  let clientId: string;
  const existingClient = await db
    .select()
    .from(clients)
    .where(ilike(clients.name, clientName))
    .limit(1);

  if (existingClient[0]) {
    clientId = existingClient[0].id;
    console.log(`Client "${clientName}" already exists (${clientId}).`);
  } else {
    clientId = "client-kfc-uganda";
    await db.insert(clients).values({
      id: clientId,
      name: clientName,
      notes,
    });
    console.log(`Created client "${clientName}" (${clientId}).`);
  }

  const existingSites = await db
    .select({ id: sites.id, name: sites.name })
    .from(sites)
    .where(eq(sites.clientId, clientId));

  const existingNames = new Set(
    existingSites.map((s) => s.name.toLowerCase()),
  );

  let created = 0;
  let skipped = 0;

  for (const branch of data.branches) {
    const siteName = branch.name.trim();
    if (existingNames.has(siteName.toLowerCase())) {
      console.log(`  skip  ${siteName} (already exists)`);
      skipped++;
      continue;
    }

    const siteId = `site-kfc-ug-${branchSlug(siteName)}`;
    await db.insert(sites).values({
      id: siteId,
      clientId,
      name: siteName,
      address: (branch.address ?? "").trim(),
      areas: createKfcChecklist(),
    });
    console.log(`  add   ${siteName}`);
    created++;
  }

  console.log(
    `\nDone — ${created} branch${created === 1 ? "" : "es"} created, ${skipped} skipped (${data.branches.length} total).`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
