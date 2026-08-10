import type { SessionUser, UserRole } from "@/lib/auth-types";

export function homePath(role: UserRole): string {
  switch (role) {
    case "technician":
      return "/";
    case "admin":
      return "/admin/users";
    case "manager":
    default:
      return "/dashboard";
  }
}

/** Route access for the app shell (page navigations). */
export function canAccessPath(role: UserRole, path: string): boolean {
  if (role === "admin") return true;

  if (role === "manager") {
    return !path.startsWith("/admin");
  }

  // PMP / technician — field only
  return path === "/" || path.startsWith("/visit/");
}

export function isAdmin(role: UserRole): boolean {
  return role === "admin";
}

export function isManagerOrAdmin(role: UserRole): boolean {
  return role === "admin" || role === "manager";
}

export function isTechnician(role: UserRole): boolean {
  return role === "technician";
}

export type NavItem = {
  href: string;
  label: string;
  short: string;
};

export const OPS_PRIMARY_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", short: "Dash" },
  { href: "/clients", label: "Clients", short: "Clients" },
  { href: "/", label: "Field Ops", short: "Field" },
  { href: "/jobs", label: "Jobs", short: "Jobs" },
];

export const ADMIN_NAV_ITEM: NavItem = {
  href: "/admin/users",
  label: "Users",
  short: "Users",
};

export const PMP_PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Field Ops", short: "Field" },
];

export const REPORT_LINKS = [
  { href: "/issues", label: "Issues report" },
  { href: "/follow-ups", label: "Follow-ups report" },
  { href: "/treatments", label: "Treatments report" },
  { href: "/reports", label: "IPM service reports" },
] as const;

export function primaryNavForRole(role: UserRole): NavItem[] {
  if (role === "technician") return PMP_PRIMARY_NAV;
  if (role === "admin") {
    return [
      OPS_PRIMARY_NAV[0],
      ADMIN_NAV_ITEM,
      ...OPS_PRIMARY_NAV.slice(1),
    ];
  }
  return OPS_PRIMARY_NAV;
}

export function showReportsNav(role: UserRole): boolean {
  return isManagerOrAdmin(role);
}

export type UserAccount = {
  id: string;
  email: string;
  username: string | null;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
};

export type CreateUserInput = {
  name: string;
  email: string;
  username: string;
  role: UserRole;
  password: string;
};

export type UpdateUserInput = {
  name?: string;
  username?: string;
  role?: UserRole;
  isActive?: boolean;
  password?: string;
};

export function jobAssignedToUser(
  job: {
    technicianId?: string | null;
    technicianName: string;
    teamMemberIds?: string[] | null;
    assignmentMode?: string | null;
  },
  user: SessionUser,
): boolean {
  if (user.id) {
    if (job.technicianId && job.technicianId === user.id) return true;
    if (Array.isArray(job.teamMemberIds) && job.teamMemberIds.includes(user.id)) {
      return true;
    }
  }
  return job.technicianName.trim().toLowerCase() === user.name.trim().toLowerCase();
}
