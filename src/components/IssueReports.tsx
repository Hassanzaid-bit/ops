"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { issueAreaRows } from "@/lib/dashboard";
import { listRecords } from "@/lib/records-store";
import { queryRecords, type VisitRecord } from "@/lib/visit-record";
import { RangeFilterBar } from "@/components/RangeFilterBar";
import { issueDetailHref } from "@/components/IssueDetail";

export function IssueReports() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [records, setRecords] = useState<VisitRecord[]>([]);
  const [query, setQuery] = useState("");

  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const client = searchParams.get("client") ?? "";
  const siteId = searchParams.get("siteId") ?? "";

  useEffect(() => {
    void listRecords().then(setRecords);
  }, []);

  const filteredRecords = useMemo(
    () =>
      queryRecords(records, {
        from: from || undefined,
        to: to || undefined,
        clientName: client || undefined,
        siteId: siteId || undefined,
      }),
    [records, from, to, client, siteId],
  );

  const rows = useMemo(
    () => issueAreaRows(filteredRecords),
    [filteredRecords],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.clientName.toLowerCase().includes(q) ||
        r.siteName.toLowerCase().includes(q) ||
        r.area.toLowerCase().includes(q) ||
        r.findings.some((f) => f.toLowerCase().includes(q)) ||
        r.pestTypes.some((p) => p.toLowerCase().includes(q)) ||
        r.technicianName.toLowerCase().includes(q) ||
        r.date.includes(q),
    );
  }, [rows, query]);

  const clients = useMemo(
    () => [...new Set(records.map((r) => r.clientName))].sort(),
    [records],
  );

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-4">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--ink)]">
          Issues report
        </h1>
        <p className="mt-2 max-w-xl text-base text-[var(--ink-muted)]">
          Areas marked Issues across submitted visits — separate from the full
          IPM service report.
        </p>
      </header>

      <section className="mb-5 space-y-3">
        <RangeFilterBar
          from={from}
          to={to}
          client={client}
          clients={clients}
          onFromChange={(v) => setParam("from", v)}
          onToChange={(v) => setParam("to", v)}
          onClientChange={(v) => setParam("client", v)}
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search client, branch, area, finding…"
          className="min-h-11 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-base outline-none focus:border-[var(--accent)]"
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
          Issue areas ({visible.length})
        </h2>
        <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface)]">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--bg)]">
                {(
                  [
                    "Date",
                    "Client",
                    "Branch",
                    "Area",
                    "Findings",
                    "Pests",
                    "Advice",
                    "Action",
                  ] as const
                ).map((label) => (
                  <th
                    key={label}
                    className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--bg)]/70"
                >
                  <td className="whitespace-nowrap px-3 py-2.5 text-[var(--ink)]">
                    {r.date}
                  </td>
                  <td className="px-3 py-2.5 text-[var(--ink)]">
                    {r.clientName}
                  </td>
                  <td className="px-3 py-2.5 font-medium text-[var(--ink)]">
                    {r.siteName}
                  </td>
                  <td className="px-3 py-2.5 text-[var(--ink)]">{r.area}</td>
                  <td
                    className="max-w-[160px] truncate px-3 py-2.5 text-[var(--ink-muted)]"
                    title={r.findings.join(", ") || undefined}
                  >
                    {r.findings.join(", ") || "—"}
                  </td>
                  <td
                    className="max-w-[140px] truncate px-3 py-2.5 text-[var(--ink-muted)]"
                    title={r.pestTypes.join(", ") || undefined}
                  >
                    {r.pestTypes.join(", ") || "—"}
                  </td>
                  <td
                    className="max-w-[160px] truncate px-3 py-2.5 text-[var(--ink-muted)]"
                    title={r.advice.join(", ") || undefined}
                  >
                    {r.advice.join(", ") || "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <Link
                      href={issueDetailHref(r.recordId, r.area)}
                      className="inline-flex min-h-9 items-center rounded-md border border-[var(--line)] px-2.5 text-xs font-semibold text-[var(--accent)]"
                    >
                      View more
                    </Link>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-10 text-center text-[var(--ink-muted)]"
                  >
                    No issue areas in this range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
