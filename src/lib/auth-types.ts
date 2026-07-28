export type UserRole = "technician" | "manager" | "admin";

export type SessionUser = {
  name: string;
  role: UserRole;
  email: string;
};

export const ROLE_LABELS: Record<UserRole, string> = {
  technician: "Technician",
  manager: "Manager",
  admin: "Admin",
};

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
