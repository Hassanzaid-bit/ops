"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import {
  ROLE_LABELS,
  initials,
  type SessionUser,
} from "@/lib/auth-types";
import {
  REPORT_LINKS,
  isAdmin,
  primaryNavForRole,
  showReportsNav,
  type NavItem,
} from "@/lib/permissions";

const SIDEBAR_KEY = "qzone-sidebar-collapsed";

const NAV_ICONS = {
  "/dashboard": IconDashboard,
  "/clients": IconClients,
  "/": IconField,
  "/jobs": IconJobs,
  "/admin/users": IconUsers,
} as const;

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

export function AppShell({
  children,
  user,
  statusBar,
}: {
  children: React.ReactNode;
  user: SessionUser;
  statusBar?: React.ReactNode;
}) {
  const pathname = usePathname();
  const primaryNav = primaryNavForRole(user.role);
  const showReports = showReportsNav(user.role);
  const reportsActive = showReports && isReportsPath(pathname);
  const [reportsOpen, setReportsOpen] = useState(reportsActive);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [collapsedReportsOpen, setCollapsedReportsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_KEY) === "1");
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

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
    setMobileNavOpen(false);
    setCollapsedReportsOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  function toggleCollapsed() {
    setCollapsed((c) => !c);
    setCollapsedReportsOpen(false);
  }

  function closeMobileNav() {
    setMobileNavOpen(false);
  }

  async function handleLogout() {
    setProfileOpen(false);
    closeMobileNav();
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.assign("/login");
    }
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden md:flex-row">
      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={closeMobileNav}
        />
      )}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex h-dvh w-56 shrink-0 flex-col overflow-y-auto bg-[var(--accent)] text-white transition-transform duration-200",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full",
          "md:relative md:z-auto md:translate-x-0 md:transition-[width]",
          collapsed ? "md:w-[4.25rem]" : "md:w-56",
        ].join(" ")}
      >
        <div
          className={[
            "border-b border-white/15 px-3 py-3",
            collapsed ? "md:flex md:flex-col md:items-center md:gap-2" : "",
          ].join(" ")}
        >
          <div
            className={[
              "flex w-full items-center gap-2",
              collapsed ? "md:justify-center" : "justify-between",
            ].join(" ")}
          >
            <div
              className={[
                "flex min-w-0 items-center gap-2",
                collapsed ? "md:w-full md:justify-center" : "flex-1",
              ].join(" ")}
            >
              <button
                type="button"
                onClick={toggleCollapsed}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white/90 transition-colors hover:bg-white/10 hover:text-white md:flex"
              >
                <IconMenu className="h-5 w-5" />
              </button>

              <div
                className={[
                  "min-w-0",
                  collapsed ? "md:hidden" : "flex-1",
                ].join(" ")}
              >
                <div className="overflow-hidden rounded-lg bg-white p-1.5 shadow-sm">
                  <Image
                    src="/qzone-logo.png"
                    alt="QZone Integrated Pest Management"
                    width={576}
                    height={224}
                    className="h-auto w-full max-w-[9.5rem]"
                    priority
                  />
                </div>
              </div>

              <div className={collapsed ? "hidden md:block" : "hidden"}>
                <div className="overflow-hidden rounded-md bg-white p-1 shadow-sm">
                  <Image
                    src="/qzone-logo.png"
                    alt="QZone"
                    width={576}
                    height={224}
                    className="h-7 w-7 object-contain"
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={closeMobileNav}
              aria-label="Close navigation menu"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white/90 transition-colors hover:bg-white/10 hover:text-white md:hidden"
            >
              <IconClose className="h-5 w-5" />
            </button>
          </div>
        </div>

        <SidebarNav
          pathname={pathname}
          primaryNav={primaryNav}
          showReports={showReports}
          reportsActive={reportsActive}
          reportsOpen={reportsOpen}
          setReportsOpen={setReportsOpen}
          collapsed={collapsed}
          collapsedReportsOpen={collapsedReportsOpen}
          setCollapsedReportsOpen={setCollapsedReportsOpen}
          onNavigate={closeMobileNav}
        />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--surface)]/95 px-4 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] text-[var(--ink)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] md:hidden"
            >
              <IconMenu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--ink)] md:hidden">
                Q Zone Field Ops
              </p>
              <p className="hidden truncate text-sm text-[var(--ink-muted)] md:block">
                Integrated pest management · Field operations
              </p>
            </div>
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
                  {isAdmin(user.role) && (
                    <Link
                      href="/admin/users"
                      role="menuitem"
                      onClick={() => setProfileOpen(false)}
                      className="flex w-full border-b border-[var(--line)] px-3 py-3 text-left text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--bg)]"
                    >
                      Users
                    </Link>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => void handleLogout()}
                    className="flex w-full px-3 py-3 text-left text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--bg)]"
                  >
                    Log out
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {statusBar}
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function SidebarNav({
  pathname,
  primaryNav,
  showReports,
  reportsActive,
  reportsOpen,
  setReportsOpen,
  collapsed,
  collapsedReportsOpen,
  setCollapsedReportsOpen,
  onNavigate,
}: {
  pathname: string;
  primaryNav: NavItem[];
  showReports: boolean;
  reportsActive: boolean;
  reportsOpen: boolean;
  setReportsOpen: Dispatch<SetStateAction<boolean>>;
  collapsed: boolean;
  collapsedReportsOpen: boolean;
  setCollapsedReportsOpen: Dispatch<SetStateAction<boolean>>;
  onNavigate: () => void;
}) {
  return (
    <nav
      className={[
        "flex flex-1 flex-col gap-1 p-3",
        collapsed ? "md:p-2" : "",
      ].join(" ")}
    >
      {primaryNav.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = NAV_ICONS[item.href as keyof typeof NAV_ICONS] ?? IconField;
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            onClick={onNavigate}
            className={[
              "flex items-center rounded-lg text-sm font-semibold transition-colors",
              "gap-2.5 px-3 py-2.5",
              collapsed
                ? "md:justify-center md:px-2 md:py-2.5"
                : "",
              active
                ? "bg-white text-[var(--accent)]"
                : "text-white/85 hover:bg-white/10 hover:text-white",
            ].join(" ")}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className={collapsed ? "md:hidden" : ""}>{item.label}</span>
          </Link>
        );
      })}

      {showReports && (
        <div className="relative mt-1">
          <button
            type="button"
            onClick={() => {
              const desktopCollapsed =
                collapsed &&
                typeof window !== "undefined" &&
                window.matchMedia("(min-width: 768px)").matches;
              if (desktopCollapsed) {
                setCollapsedReportsOpen((o) => !o);
              } else {
                setReportsOpen((o) => !o);
              }
            }}
            aria-expanded={reportsOpen || collapsedReportsOpen}
            title="Reports"
            className={[
              "flex w-full items-center rounded-lg text-sm font-semibold transition-colors",
              "justify-between gap-2 px-3 py-2.5 text-left",
              collapsed
                ? "md:justify-center md:px-2 md:py-2.5"
                : "",
              reportsActive
                ? "bg-white/15 text-white"
                : "text-white/85 hover:bg-white/10 hover:text-white",
            ].join(" ")}
          >
            <span className="flex items-center gap-2.5">
              <IconReports className="h-5 w-5 shrink-0" />
              <span className={collapsed ? "md:hidden" : ""}>Reports</span>
            </span>
            {!collapsed ? (
              <span
                className={[
                  "text-xs transition-transform",
                  reportsOpen ? "rotate-180" : "",
                ].join(" ")}
                aria-hidden
              >
                ▾
              </span>
            ) : (
              <span
                className={[
                  "text-xs transition-transform md:hidden",
                  reportsOpen ? "rotate-180" : "",
                ].join(" ")}
                aria-hidden
              >
                ▾
              </span>
            )}
          </button>

          <div
            className={[
              "mt-1 ml-3 space-y-0.5 border-l border-white/20 py-1 pl-2",
              reportsOpen ? "" : "hidden",
              collapsed ? "md:hidden" : "",
            ].join(" ")}
          >
              {REPORT_LINKS.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
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
                      onClick={onNavigate}
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
      )}
    </nav>
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

function IconUsers({ className }: { className?: string }) {
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
      <path d="M19 8v6M22 11h-6" strokeLinecap="round" />
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

function IconClose({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}
