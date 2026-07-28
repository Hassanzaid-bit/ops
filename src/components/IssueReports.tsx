"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  issueAreaRows,
  visitIssuesCount,
  type IssueAreaRow,
} from "@/lib/dashboard";
import { listRecords } from "@/lib/records-store";
import { generateIssuesReportFromRecord } from "@/lib/report";
import { normalizeAreaInspection } from "@/lib/types";
import { VISIT_TYPE_LABELS } from "@/lib/vocabulary";
import { queryRecords, type VisitRecord } from "@/lib/visit-record";
import { RangeFilterBar } from "@/components/RangeFilterBar";

export function IssueReports() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [records, setRecords] = useState<VisitRecord[]>([]);
  const [query, setQuery] = useState("");
  const [modalId, setModalId] = useState<string | null>(null);

  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const client = searchParams.get("client") ?? "";
  const siteId = searchParams.get("siteId") ?? "";

  useEffect(() => {
    setRecords(listRecords());
  }, []);

  useEffect(() => {
    const id = searchParams.get("issue");
    if (id) setModalId(id);
  }, [searchParams]);

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

  const selected = visible.find((r) => r.id === modalId) ??
    rows.find((r) => r.id === modalId) ??
    null;
  const selectedRecord = selected
    ? (records.find((r) => r.id === selected.recordId) ?? null)
    : null;

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

  function openIssue(id: string) {
    setModalId(id);
    setParam("issue", id);
  }

  function closeModal() {
    setModalId(null);
    setParam("issue", "");
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
                    <button
                      type="button"
                      onClick={() => openIssue(r.id)}
                      className="min-h-9 rounded-md border border-[var(--line)] px-2.5 text-xs font-semibold text-[var(--accent)]"
                    >
                      View more
                    </button>
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

      {selected && selectedRecord && (
        <IssueDetailModal
          row={selected}
          record={selectedRecord}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

function IssueDetailModal({
  row,
  record,
  onClose,
}: {
  row: IssueAreaRow;
  record: VisitRecord;
  onClose: () => void;
}) {
  const titleId = useId();
  const area = useMemo(() => {
    const raw = record.areas.find((a) => a.area === row.area);
    return raw ? normalizeAreaInspection(raw, raw.area) : null;
  }, [record, row.area]);
  const reportText = useMemo(
    () => generateIssuesReportFromRecord(record),
    [record],
  );
  const issueCount = visitIssuesCount(record);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-[var(--ink)]/45"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[min(90vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-lg font-semibold text-[var(--ink)]"
            >
              {row.area}
            </h2>
            <p className="text-sm text-[var(--ink-muted)]">
              {row.clientName} · {row.siteName} · {row.date} ·{" "}
              {VISIT_TYPE_LABELS[row.visitType]}
            </p>
            <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
              {issueCount} issue area{issueCount === 1 ? "" : "s"} on this visit
              · {row.technicianName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-9 shrink-0 rounded-lg px-2 text-sm font-semibold text-[var(--ink-muted)]"
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {area && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                  Findings
                </p>
                <p className="mt-1 text-sm text-[var(--ink)]">
                  {area.findings.join(", ") || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                  Pests
                </p>
                <p className="mt-1 text-sm text-[var(--ink)]">
                  {area.pestTypes.join(", ") || "—"}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                  Advice
                </p>
                <p className="mt-1 text-sm text-[var(--ink)]">
                  {area.advice.join(", ") || "—"}
                </p>
              </div>
              {area.notes.trim() && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                    Notes
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--ink)]">
                    {area.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
              Visit issues report
            </p>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-[var(--line)] bg-[var(--bg)] p-3 text-xs leading-relaxed text-[var(--ink)]">
              {reportText}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
