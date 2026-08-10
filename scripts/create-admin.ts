import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { users } from "../src/lib/db/schema";

const DEFAULT_EMAIL = "admin@qzone.co.ke";
const DEFAULT_PASSWORD = "Password@123!";
const DEFAULT_NAME = "Super Admin";

const DEFAULT_USERNAME = "admin";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Add it to .env.local first.");
    process.exit(1);
  }

  const email = (process.env.ADMIN_EMAIL ?? DEFAULT_EMAIL).trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? DEFAULT_PASSWORD;
  const name = process.env.ADMIN_NAME ?? DEFAULT_NAME;

  const username = (process.env.ADMIN_USERNAME ?? DEFAULT_USERNAME)
    .trim()
    .toLowerCase();

  if (!password) {
    console.error("ADMIN_PASSWORD cannot be empty.");
    process.exit(1);
  }

  const db = drizzle(neon(url));

  const existing = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    console.log(`Admin already exists: ${existing[0].email}`);
    console.log("No changes made.");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await db.insert(users).values({
    id: "user-super-admin",
    email,
    username,
    name,
    passwordHash,
    role: "admin",
  });

  console.log("Super admin created.");
  console.log(`  Email:    ${email}`);
  console.log(`  Username: ${username}`);
  console.log(`  Password: ${password}`);
  console.log("  Role:     admin");
  console.log("");
  console.log("No demo clients, sites, or jobs were added.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
