import "server-only";

import { cookies } from "next/headers";
import type { SessionUser } from "@/lib/auth-types";
import {
  SESSION_COOKIE,
  decrypt,
  encrypt,
} from "@/lib/session-token";

export { SESSION_COOKIE, decrypt } from "@/lib/session-token";

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax" as const,
    path: "/",
  };
}

export async function createSessionToken(user: SessionUser) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const value = await encrypt({
    email: user.email,
    name: user.name,
    role: user.role,
    expiresAt: expiresAt.toISOString(),
  });
  return { value, expiresAt };
}

export async function createSession(user: SessionUser) {
  const { value, expiresAt } = await createSessionToken(user);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, value, sessionCookieOptions(expiresAt));
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
