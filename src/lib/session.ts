import "server-only";

import { cookies } from "next/headers";
import type { SessionUser } from "@/lib/auth-types";
import {
  SESSION_COOKIE,
  decrypt,
  encrypt,
} from "@/lib/session-token";

export { SESSION_COOKIE, decrypt } from "@/lib/session-token";

export async function createSession(user: SessionUser) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await encrypt({
    email: user.email,
    name: user.name,
    role: user.role,
    expiresAt: expiresAt.toISOString(),
  });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE)?.value;
  return decrypt(cookie);
}
