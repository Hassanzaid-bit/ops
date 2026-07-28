import "server-only";

import type { SessionUser, UserRole } from "@/lib/auth-types";

export type AuthUser = SessionUser & {
  passwordHash: string;
};

/**
 * Seeded ops account. Password: Password@123! (bcrypt hash only stored here).
 */
const USERS: AuthUser[] = [
  {
    name: "Operations Manager",
    role: "manager" satisfies UserRole,
    email: "ops@qzone.co.ke",
    passwordHash:
      "$2b$10$Kx9bvQYC9VL5v0Dfl40NZ.qkAEbPNS.5KXQO9A.Swj43S9P36nRz6",
  },
];

export function findUserByEmail(email: string): AuthUser | undefined {
  const normalized = email.trim().toLowerCase();
  return USERS.find((user) => user.email.toLowerCase() === normalized);
}

export function toSessionUser(user: AuthUser): SessionUser {
  return {
    name: user.name,
    role: user.role,
    email: user.email,
  };
}
