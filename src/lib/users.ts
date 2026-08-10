import type { SessionUser, UserRole } from "@/lib/auth-types";

type DbUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

export function toSessionUser(user: DbUser): SessionUser {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    email: user.email,
  };
}

export { findUserByEmail, verifyUserPassword } from "@/lib/db/queries";
