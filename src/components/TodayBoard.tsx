"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { SYNC_STATUS_EVENT } from "@/lib/offline/sync";
import { listSites, listTodayVisits, refreshFieldCache } from "@/lib/ops-store";
import { listDraftMeta } from "@/lib/storage";
import type { ScheduledVisit, Site } from "@/lib/types";
import { VISIT_TYPE_LABELS } from "@/lib/vocabulary";

type DraftState = "none" | "draft" | "submitted";

export function TodayBoard() {
  const [visits, setVisits] = useState<ScheduledVisit[]>([]);
  const [sitesById, setSitesById] = useState<Record<string, Site>>({});
  const [meta, setMeta] = useState<Record<string, DraftState>>({});

  const refresh = useCallback(() => {
    void (async () => {
      await refreshFieldCache();
      const [today, sites] = await Promise.all([
        listTodayVisits(),
        listSites(),
      ]);
      setVisits(today);
      setSitesById(Object.fromEntries(sites.map((s) => [s.id, s])));
      const map: Record<string, DraftState> = {};
      for (const v of today) map[v.id] = "none";
      for (const d of await listDraftMeta()) {
        if (!(d.visitId in map)) continue;
        map[d.visitId] = d.submittedAt ? "submitted" : "draft";
      }
      setMeta(map);
    })();
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(SYNC_STATUS_EVENT, refresh);
    window.addEventListener("online", refresh);
    return () => {
      window.removeEventListener(SYNC_STATUS_EVENT, refresh);
      window.removeEventListener("online", refresh);
    };
  }, [refresh]);

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="mx-auto max-w-5xl px-4 pb-10 pt-6">
      <header className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--accent-deep)]">
          Q Zone
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--ink)]">
          Field Ops
        </h1>
        <p className="mt-2 text-base text-[var(--ink-muted)]">
          {today}
          {visits[0]
            ? visits[0].assignmentMode === "team"
              ? ` · Team jobs for ${visits[0].technicianName}`
              : ` · ${visits[0].technicianName}`
            : ""}
        </p>
      </header>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
            Today&apos;s jobs
          </h2>
          <Link
            href="/jobs"
            className="text-sm font-semibold text-[var(--accent-deep)]"
          >
            Manage
          </Link>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface)]">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--bg)]">
                <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                  Time
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                  Client
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                  Branch
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                  Visit type
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                  Status
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {visits.map((visit) => {
                const site = sitesById[visit.siteId];
                const state = meta[visit.id] ?? "none";
                return (
                  <tr
                    key={visit.id}
                    className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--bg)]/70"
                  >
                    <td className="whitespace-nowrap px-3 py-2.5 text-[var(--ink)]">
                      {visit.timeWindow || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-[var(--ink)]">
                      {site?.clientName ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-[var(--ink)]">
                      {site?.siteName ?? "Unknown"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[var(--ink)]">
                      {VISIT_TYPE_LABELS[visit.visitType]}
                      {visit.visitType === "follow_up" &&
                      visit.followUpAreas?.length
                        ? ` · ${visit.followUpAreas.length} areas`
                        : ""}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusPill state={state} />
                    </td>
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/visit/${visit.id}`}
                        className="inline-flex min-h-9 items-center rounded-md bg-[var(--accent)] px-2.5 text-xs font-semibold text-[var(--accent-ink)]"
                      >
                        {state === "submitted"
                          ? "Open"
                          : state === "draft"
                            ? "Continue"
                            : "Start"}
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {visits.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-10 text-center text-[var(--ink-muted)]"
                  >
                    No jobs scheduled for today.{" "}
                    <Link
                      href="/jobs"
                      className="font-semibold text-[var(--accent-deep)]"
                    >
                      Create jobs →
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-6 text-sm leading-relaxed text-[var(--ink-muted)]">
        Jobs are set under Jobs. Capture on-site with chips — report writes
        itself. Open today&apos;s jobs once while online to use them offline.
      </p>
    </div>
  );
}

function StatusPill({ state }: { state: DraftState }) {
  if (state === "submitted") {
    return (
      <span className="inline-block rounded-md bg-[var(--ok-soft)] px-2 py-1 text-xs font-semibold text-[var(--ok)]">
        Submitted
      </span>
    );
  }
  if (state === "draft") {
    return (
      <span className="inline-block rounded-md bg-[var(--warn-soft)] px-2 py-1 text-xs font-semibold text-[var(--warn)]">
        Draft
      </span>
    );
  }
  return (
    <span className="inline-block rounded-md bg-[var(--line)] px-2 py-1 text-xs font-semibold text-[var(--ink-muted)]">
      Open
    </span>
  );
}
