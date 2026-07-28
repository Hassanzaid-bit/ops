"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ROLE_LABELS,
  clearSession,
  getSession,
  initials,
  type SessionUser,
} from "@/lib/session";

const SIDEBAR_KEY = "qzone-sidebar-collapsed";

const PRIMARY_NAV = [
  {
    href: "/dashboard",
    label: "Dashboard",
    short: "Dash",
    icon: IconDashboard,
  },
  { href: "/clients", label: "Clients", short: "Clients", icon: IconClients },
  { href: "/", label: "Field Ops", short: "Field", icon: IconField },
  { href: "/jobs", label: "Jobs", short: "Jobs", icon: IconJobs },
] as const;

const REPORT_LINKS = [
  { href: "/issues", label: "Issues report" },
  { href: "/follow-ups", label: "Follow-ups report" },
  { href: "/treatments", label: "Treatments report" },
  { href: "/reports", label: "IPM service reports" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isReportsPath(pathname: string) {
  return (
    pathname === "/reports" ||
    pathname.startsWith("/reports/") ||
    pathname === "/issues" ||
    pathname.startsWith("/issues/") ||
    pathname === "/follow-ups" ||
    pathname.startsWith("/follow-ups/") ||
    pathname === "/treatments" ||
    pathname.startsWith("/treatments/")
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const reportsActive = isReportsPath(pathname);
  const [reportsOpen, setReportsOpen] = useState(reportsActive);
  const [mobileReportsOpen, setMobileReportsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [collapsedReportsOpen, setCollapsedReportsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_KEY) === "1");
    } catch {
      /* ignore */
    }
    const session = getSession();
    setUser(session);
    setHydrated(true);
    if (!session) {
      router.replace("/login");
    }
  }, [router]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [collapsed, hydrated]);

  useEffect(() => {
    if (reportsActive) setReportsOpen(true);
  }, [reportsActive]);

  useEffect(() => {
    setMobileReportsOpen(false);
    setCollapsedReportsOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  function toggleCollapsed() {
    setCollapsed((c) => !c);
    setCollapsedReportsOpen(false);
  }

  function logout() {
    clearSession();
    setUser(null);
    setProfileOpen(false);
    router.replace("/login");
  }

  if (!hydrated || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--bg)] text-[var(--ink-muted)]">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden md:flex-row">
      <aside
        className={[
          "hidden h-dvh shrink-0 flex-col overflow-y-auto bg-[var(--accent)] text-white transition-[width] duration-200 md:flex",
          collapsed ? "w-[4.25rem]" : "w-56",
        ].join(" ")}
      >
        <div
          className={[
            "flex items-center border-b border-white/15",
            collapsed ? "justify-center px-2 py-3" : "gap-2 px-3 py-3",
          ].join(" ")}
        >
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white/90 transition-colors hover:bg-white/10 hover:text-white"
          >
            <IconMenu className="h-5 w-5" />
          </button>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                Q Zone
              </p>
              <p className="text-base font-semibold leading-tight tracking-tight">
                Field Ops
              </p>
            </div>
          )}
        </div>

        <nav
          className={[
            "flex flex-1 flex-col gap-1",
            collapsed ? "p-2" : "p-3",
          ].join(" ")}
        >
          {PRIMARY_NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={[
                  "flex items-center rounded-lg text-sm font-semibold transition-colors",
                  collapsed
                    ? "justify-center px-2 py-2.5"
                    : "gap-2.5 px-3 py-2.5",
                  active
                    ? "bg-white text-[var(--accent)]"
                    : "text-white/85 hover:bg-white/10 hover:text-white",
                ].join(" ")}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}

          <div className="relative mt-1">
            <button
              type="button"
              onClick={() => {
                if (collapsed) {
                  setCollapsedReportsOpen((o) => !o);
                } else {
                  setReportsOpen((o) => !o);
                }
              }}
              aria-expanded={collapsed ? collapsedReportsOpen : reportsOpen}
              title="Reports"
              className={[
                "flex w-full items-center rounded-lg text-sm font-semibold transition-colors",
                collapsed
                  ? "justify-center px-2 py-2.5"
                  : "justify-between gap-2 px-3 py-2.5 text-left",
                reportsActive
                  ? "bg-white/15 text-white"
                  : "text-white/85 hover:bg-white/10 hover:text-white",
              ].join(" ")}
            >
              <span className="flex items-center gap-2.5">
                <IconReports className="h-5 w-5 shrink-0" />
                {!collapsed && <span>Reports</span>}
              </span>
              {!collapsed && (
                <span
                  className={[
                    "text-xs transition-transform",
                    reportsOpen ? "rotate-180" : "",
                  ].join(" ")}
                  aria-hidden
                >
                  ▾
                </span>
              )}
            </button>

            {!collapsed && reportsOpen && (
              <div className="mt-1 ml-3 space-y-0.5 border-l border-white/20 py-1 pl-2">
                {REPORT_LINKS.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={[
                        "block rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                        active
                          ? "bg-white text-[var(--accent)]"
                          : "text-white/80 hover:bg-white/10 hover:text-white",
                      ].join(" ")}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}

            {collapsed && collapsedReportsOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close reports menu"
                  className="fixed inset-0 z-40"
                  onClick={() => setCollapsedReportsOpen(false)}
                />
                <div className="absolute left-[calc(100%+0.4rem)] top-0 z-50 min-w-[12rem] overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)] py-1 shadow-[var(--shadow)]">
                  {REPORT_LINKS.map((item) => {
                    const active = isActive(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={[
                          "block px-3 py-2.5 text-sm font-semibold",
                          active
                            ? "bg-[var(--bg)] text-[var(--accent)]"
                            : "text-[var(--ink)] hover:bg-[var(--bg)]",
                        ].join(" ")}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </nav>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pb-20 md:pb-0">
        <header className="z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--surface)]/95 px-4 backdrop-blur">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--ink)] md:hidden">
              Q Zone Field Ops
            </p>
            <p className="hidden truncate text-sm text-[var(--ink-muted)] md:block">
              Integrated pest management · Field operations
            </p>
          </div>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setProfileOpen((o) => !o)}
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--bg)] py-1 pl-1 pr-2.5 transition-colors hover:border-[var(--accent)]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-semibold text-[var(--accent-ink)]">
                {initials(user.name)}
              </span>
              <span className="hidden min-w-0 text-left sm:block">
                <span className="block max-w-[9rem] truncate text-xs font-semibold text-[var(--ink)]">
                  {user.name}
                </span>
                <span className="block text-[10px] text-[var(--ink-muted)]">
                  {ROLE_LABELS[user.role]}
                </span>
              </span>
              <span className="text-[10px] text-[var(--ink-muted)]" aria-hidden>
                ▾
              </span>
            </button>

            {profileOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close profile menu"
                  className="fixed inset-0 z-40"
                  onClick={() => setProfileOpen(false)}
                />
                <div
                  role="menu"
                  className="absolute right-0 top-[calc(100%+0.4rem)] z-50 w-56 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]"
                >
                  <div className="border-b border-[var(--line)] px-3 py-3">
                    <p className="text-sm font-semibold text-[var(--ink)]">
                      {user.name}
                    </p>
                    <p className="text-xs text-[var(--ink-muted)]">
                      {ROLE_LABELS[user.role]}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-[var(--ink-muted)]">
                      {user.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={logout}
                    className="flex w-full px-3 py-3 text-left text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--bg)]"
                  >
                    Log out
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[var(--surface)]/95 backdrop-blur md:hidden">
        <ul className="mx-auto flex max-w-lg">
          {PRIMARY_NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  className={[
                    "flex min-h-12 flex-col items-center justify-center px-1 text-xs font-semibold",
                    active
                      ? "text-[var(--accent)]"
                      : "text-[var(--ink-muted)]",
                  ].join(" ")}
                >
                  {item.short}
                </Link>
              </li>
            );
          })}
          <li className="relative flex-1">
            <button
              type="button"
              onClick={() => setMobileReportsOpen((o) => !o)}
              aria-expanded={mobileReportsOpen}
              className={[
                "flex min-h-12 w-full flex-col items-center justify-center px-1 text-xs font-semibold",
                reportsActive || mobileReportsOpen
                  ? "text-[var(--accent)]"
                  : "text-[var(--ink-muted)]",
              ].join(" ")}
            >
              Reports
            </button>
            {mobileReportsOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close reports menu"
                  className="fixed inset-0 z-40"
                  onClick={() => setMobileReportsOpen(false)}
                />
                <div className="absolute bottom-[calc(100%+0.5rem)] right-1 z-50 min-w-[11rem] overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]">
                  {REPORT_LINKS.map((item) => {
                    const active = isActive(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={[
                          "block px-3 py-3 text-sm font-semibold",
                          active
                            ? "bg-[var(--bg)] text-[var(--accent)]"
                            : "text-[var(--ink)]",
                        ].join(" ")}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </li>
        </ul>
      </nav>
    </div>
  );
}

function IconDashboard({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path d="M4 13h7V4H4v9Zm9 7h7V11h-7v9ZM4 20h7v-5H4v5Zm9-11h7V4h-7v5Z" />
    </svg>
  );
}

function IconClients({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="3.5" />
      <path d="M22 21v-2a3.5 3.5 0 0 0-2.5-3.35" />
      <path d="M16.5 3.7a3.5 3.5 0 0 1 0 6.6" />
    </svg>
  );
}

function IconField({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function IconJobs({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <rect x="3.5" y="7" width="17" height="13" rx="2" />
      <path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7" />
      <path d="M3.5 12h17" />
    </svg>
  );
}

function IconReports({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path d="M7 3.5h7.5L19 8v12.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z" />
      <path d="M14 3.5V8h4.5" />
      <path d="M8.5 13h7M8.5 16.5h5" />
    </svg>
  );
}

function IconMenu({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}
