import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { DEFAULT_IPM_AREAS } from "../src/lib/real-checklist";
import { flatNamesToChecklistAreas } from "../src/lib/site-checklist";
import { SEED_RECORDS } from "../src/lib/seed-records";
import { clients, jobs, sites, users, visitRecords } from "../src/lib/db/schema";

const MANAGER_PASSWORD = "Password@123!";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Add it to .env first.");
    process.exit(1);
  }

  const db = drizzle(neon(url));

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, "ops@qzone.co.ke"))
    .limit(1);

  if (existing.length > 0) {
    console.log("Seed skipped — data already present.");
    return;
  }

  const passwordHash = await bcrypt.hash(MANAGER_PASSWORD, 10);
  const today = new Date().toISOString().slice(0, 10);

  await db.insert(users).values([
    {
      id: "user-manager-ops",
      email: "ops@qzone.co.ke",
      name: "Operations Manager",
      passwordHash,
      role: "manager",
    },
    {
      id: "user-tech-boniface",
      email: "boniface@qzone.co.ke",
      name: "Boniface Kithinga",
      passwordHash,
      role: "technician",
    },
    {
      id: "user-tech-amina",
      email: "amina@qzone.co.ke",
      name: "Amina Wanjiru",
      passwordHash,
      role: "technician",
    },
  ]);

  await db.insert(clients).values({
    id: "client-kfc",
    name: "KFC",
    notes: "",
  });

  const seedChecklist = flatNamesToChecklistAreas([...DEFAULT_IPM_AREAS]);

  await db.insert(sites).values([
    {
      id: "site-01",
      clientId: "client-kfc",
      name: "Kakamega",
      address: "",
      areas: seedChecklist,
    },
    {
      id: "site-02",
      clientId: "client-kfc",
      name: "Westside Mall",
      address: "",
      areas: seedChecklist,
    },
  ]);

  await db.insert(jobs).values([
    {
      id: "visit-001",
      siteId: "site-01",
      technicianId: "user-tech-boniface",
      technicianName: "Boniface Kithinga",
      visitType: "full_inspection",
      date: today,
      status: "scheduled",
      timeWindow: "08:00 – 11:30",
    },
    {
      id: "visit-002",
      siteId: "site-01",
      technicianId: "user-tech-boniface",
      technicianName: "Boniface Kithinga",
      visitType: "follow_up",
      date: today,
      status: "scheduled",
      timeWindow: "12:00 – 13:00",
      followUpAreas: [
        "Fly Control Units (FCUs)",
        "Grease Trap",
        "Manholes & Drainage Systems",
      ],
      parentVisitId: "visit-001",
    },
    {
      id: "visit-003",
      siteId: "site-02",
      technicianId: "user-tech-amina",
      technicianName: "Amina Wanjiru",
      visitType: "full_inspection",
      date: today,
      status: "scheduled",
      timeWindow: "14:00 – 17:00",
    },
  ]);

  if (SEED_RECORDS.length > 0) {
    await db.insert(visitRecords).values(
      SEED_RECORDS.map((r) => ({
        id: r.id,
        jobId: r.visitId,
        siteId: r.siteId,
        clientName: r.clientName,
        siteName: r.siteName,
        visitType: r.visitType,
        technicianName: r.technicianName,
        date: r.date,
        submittedAt: new Date(r.submittedAt),
        areas: r.areas,
        reportText: r.reportText,
        submitId: `${r.visitId}:${r.date}`,
      })),
    );
  }

  console.log("Seed complete.");
  console.log(`Login: ops@qzone.co.ke / ${MANAGER_PASSWORD}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
