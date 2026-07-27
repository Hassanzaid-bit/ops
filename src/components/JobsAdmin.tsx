"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { listSites, listVisitsForDate, todayISO } from "@/lib/ops-store";
import { parentVisitLabel } from "@/lib/parent-visits";
import type { Site } from "@/lib/types";
import { VISIT_TYPE_LABELS } from "@/lib/vocabulary";

export function JobsAdmin() {
  const [date, setDate] = useState(todayISO);
  const [sites, setSites] = useState<Site[]>([]);
  const [visits, setVisits] = useState(() => listVisitsForDate(todayISO()));

  const refresh = useCallback(() => {
    setSites(listSites());
    setVisits(listVisitsForDate(date));
  }, [date]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-4">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--ink)]">
          Jobs
        </h1>
        <p className="mt-2 text-base text-[var(--ink-muted)]">
          Schedule visits by date. Field Ops pulls from here.
        </p>
      </header>

      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
              Date
            </span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </label>
          <Link
            href={`/jobs/new?date=${encodeURIComponent(date)}`}
            className="inline-flex min-h-11 items-center rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-ink)]"
          >
            + Add job
          </Link>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface)]">
          <table className="w-full min-w-[780px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--bg)]">
                {(
                  [
                    "Client",
                    "Branch",
                    "Visit type",
                    "Original visit",
                    "Technician",
                    "Areas",
                    "Actions",
                  ] as const
                ).map((label) => (
                  <th
                    key={label}
                    className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visits.map((v) => {
                const site = sites.find((s) => s.id === v.siteId);
                const areaSummary =
                  v.visitType === "follow_up" && v.followUpAreas?.length
                    ? v.followUpAreas.join(", ")
                    : site
                      ? `${site.areas.length} checklist areas`
                      : "—";
                const parentLabel =
                  v.visitType === "follow_up" && v.parentVisitId
                    ? parentVisitLabel(v.parentVisitId)
                    : null;
                return (
                  <tr
                    key={v.id}
                    className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--bg)]/70"
                  >
                    <td className="px-3 py-3 text-[var(--ink)]">
                      {site?.clientName ?? "—"}
                    </td>
                    <td className="px-3 py-3 font-medium text-[var(--ink)]">
                      {site?.siteName ?? "Unknown"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-[var(--ink)]">
                      {VISIT_TYPE_LABELS[v.visitType]}
                    </td>
                    <td
                      className="max-w-[220px] truncate px-3 py-3 text-[var(--ink-muted)]"
                      title={parentLabel ?? undefined}
                    >
                      {v.visitType === "follow_up"
                        ? (parentLabel ?? "—")
                        : "—"}
                    </td>
                    <td className="px-3 py-3 text-[var(--ink)]">
                      {v.technicianName}
                    </td>
                    <td
                      className="max-w-[200px] truncate px-3 py-3 text-[var(--ink-muted)]"
                      title={areaSummary}
                    >
                      {areaSummary}
                    </td>
                    <td className="px-3 py-3">
                      <Link
                        href={`/jobs/${v.id}`}
                        className="inline-flex min-h-9 items-center rounded-md border border-[var(--line)] px-2.5 text-xs font-semibold"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {visits.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-10 text-center text-[var(--ink-muted)]"
                  >
                    No jobs for this date. Add a branch under Clients if
                    needed, then add a job.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "min-h-12 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 text-base text-[var(--ink)] outline-none focus:border-[var(--accent)]";
