import { SignJWT, jwtVerify } from "jose";
import type { SessionUser, UserRole } from "@/lib/auth-types";

export const SESSION_COOKIE = "qzone-session";

export type SessionPayload = {
  email: string;
  name: string;
  role: UserRole;
  expiresAt: string;
};

function getSecretKey() {
  const secretKey = process.env.SESSION_SECRET;
  if (!secretKey) {
    throw new Error("SESSION_SECRET is not set");
  }
  return new TextEncoder().encode(secretKey);
}

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey());
}

export async function decrypt(
  session: string | undefined = "",
): Promise<SessionUser | null> {
  if (!session) return null;
  try {
    const { payload } = await jwtVerify(session, getSecretKey(), {
      algorithms: ["HS256"],
    });
    const email = payload.email;
    const name = payload.name;
    const role = payload.role;
    if (
      typeof email !== "string" ||
      typeof name !== "string" ||
      (role !== "technician" && role !== "manager" && role !== "admin")
    ) {
      return null;
    }
    return { email, name, role };
  } catch {
    return null;
  }
}
