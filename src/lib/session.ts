export type UserRole = "technician" | "manager" | "admin";

export type SessionUser = {
  name: string;
  role: UserRole;
  email: string;
};

const SESSION_KEY = "qzone-session-v1";

export const DEMO_USERS: SessionUser[] = [
  {
    name: "Boniface Kithinga",
    role: "technician",
    email: "boniface@qzone.co.ke",
  },
  {
    name: "Amina Wanjiru",
    role: "technician",
    email: "amina@qzone.co.ke",
  },
  {
    name: "Operations Manager",
    role: "manager",
    email: "ops@qzone.co.ke",
  },
];

export const ROLE_LABELS: Record<UserRole, string> = {
  technician: "Technician",
  manager: "Manager",
  admin: "Admin",
};

export function getSession(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionUser;
    if (!parsed?.name || !parsed?.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setSession(user: SessionUser) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
