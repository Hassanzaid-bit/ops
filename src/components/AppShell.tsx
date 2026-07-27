"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const PRIMARY_NAV = [
  { href: "/dashboard", label: "Dashboard", short: "Dash" },
  { href: "/clients", label: "Clients", short: "Clients" },
  { href: "/", label: "Field Ops", short: "Field" },
  { href: "/jobs", label: "Jobs", short: "Jobs" },
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
  const reportsActive = isReportsPath(pathname);
  const [reportsOpen, setReportsOpen] = useState(reportsActive);
  const [mobileReportsOpen, setMobileReportsOpen] = useState(false);

  useEffect(() => {
    if (reportsActive) setReportsOpen(true);
  }, [reportsActive]);

  useEffect(() => {
    setMobileReportsOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <aside className="hidden w-56 shrink-0 flex-col bg-[var(--accent)] text-white md:flex md:min-h-dvh md:self-stretch">
        <div className="border-b border-white/15 px-4 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
            Q Zone
          </p>
          <p className="mt-1 text-lg font-semibold tracking-tight">Field Ops</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {PRIMARY_NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                  active
                    ? "bg-white text-[var(--accent)]"
                    : "text-white/85 hover:bg-white/10 hover:text-white",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}

          <div className="mt-1">
            <button
              type="button"
              onClick={() => setReportsOpen((o) => !o)}
              aria-expanded={reportsOpen}
              className={[
                "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors",
                reportsActive
                  ? "bg-white/15 text-white"
                  : "text-white/85 hover:bg-white/10 hover:text-white",
              ].join(" ")}
            >
              <span>Reports</span>
              <span
                className={[
                  "text-xs transition-transform",
                  reportsOpen ? "rotate-180" : "",
                ].join(" ")}
                aria-hidden
              >
                ▾
              </span>
            </button>
            {reportsOpen && (
              <div className="mt-1 space-y-0.5 border-l border-white/20 py-1 pl-2 ml-3">
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
          </div>
        </nav>
      </aside>

      <div className="min-w-0 flex-1 pb-20 md:pb-0">{children}</div>

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
