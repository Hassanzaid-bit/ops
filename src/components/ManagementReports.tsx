"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchableSelect } from "@/components/SearchableSelect";
import {
  visitAdviceFlags,
  visitCleanCount,
  visitHasAdvice,
  visitIssuesCount,
  visitPhotoTotal,
  visitProducts,
  visitTreatmentRows,
  visitUniqueFindings,
  visitUniquePests,
} from "@/lib/dashboard";
import { listRecords } from "@/lib/records-store";
import { generateReportFromRecord } from "@/lib/report";
import { normalizeAreaInspection, normalizeTreatment } from "@/lib/types";
import { formatTreatmentLine, VISIT_TYPE_LABELS } from "@/lib/vocabulary";
import {
  queryRecords,
  type VisitRecord,
  type VisitRecordFilter,
} from "@/lib/visit-record";

type Tab = "report" | "audit";

export function ManagementReports() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [records, setRecords] = useState<VisitRecord[]>([]);
  const [modalId, setModalId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab | null>(null);
  const [filter, setFilter] = useState<VisitRecordFilter>({
    visitType: "all",
  });
  const [reportQuery, setReportQuery] = useState("");

  useEffect(() => {
    setRecords(listRecords());
  }, []);

  useEffect(() => {
    const id = searchParams.get("record");
    if (!id || records.length === 0) return;
    if (records.some((r) => r.id === id)) {
      setModalId(id);
      setTab(null);
    }
  }, [searchParams, records]);

  const filtered = useMemo(() => {
    const base = queryRecords(records, filter);
    const q = reportQuery.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (r) =>
        r.siteName.toLowerCase().includes(q) ||
        r.clientName.toLowerCase().includes(q) ||
        r.technicianName.toLowerCase().includes(q) ||
        r.date.toLowerCase().includes(q) ||
        r.areas.some((a) => a.area.toLowerCase().includes(q)) ||
        r.reportText.toLowerCase().includes(q),
    );
  }, [records, filter, reportQuery]);

  // Prefer filtered list; fall back to all records so deep links still open
  const selected =
    filtered.find((r) => r.id === modalId) ??
    records.find((r) => r.id === modalId) ??
    null;

  const allAreas = useMemo(() => {
    const set = new Set<string>();
    for (const r of records) for (const a of r.areas) set.add(a.area);
    return [...set].sort();
  }, [records]);

  function openVisit(id: string) {
    setModalId(id);
    setTab(null);
    const params = new URLSearchParams(searchParams.toString());
    params.set("record", id);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function closeModal() {
    setModalId(null);
    setTab(null);
    if (searchParams.get("record")) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("record");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-12 pt-4">
      <header className="mb-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--accent-deep)]">
            Q Zone
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--ink)]">
            IPM service reports
          </h1>
          <p className="mt-2 max-w-xl text-base text-[var(--ink-muted)]">
            Visit register and management summary from submitted records.
          </p>
        </div>
      </header>

      <section className="mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={reportQuery}
            onChange={(e) => setReportQuery(e.target.value)}
            placeholder="Search client, branch, technician, date…"
            className="min-h-11 min-w-[12rem] flex-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-base outline-none focus:border-[var(--accent)]"
          />
          <select
            className={selectClass}
            value={filter.visitType ?? "all"}
            onChange={(e) =>
              setFilter((f) => ({
                ...f,
                visitType: e.target.value as VisitRecordFilter["visitType"],
              }))
            }
          >
            <option value="all">All visit types</option>
            <option value="full_inspection">Full Inspection</option>
            <option value="follow_up">Follow-up</option>
          </select>
          {allAreas.length >= 8 && (
            <div className="min-w-[12rem] flex-1 basis-[12rem] sm:max-w-xs">
              <SearchableSelect
                options={allAreas}
                selected={filter.area ? [filter.area] : []}
                onChange={(next) =>
                  setFilter((f) => ({
                    ...f,
                    area: next[next.length - 1] || undefined,
                  }))
                }
                multi={false}
                placeholder="Filter by area…"
              />
            </div>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
          Visit register ({filtered.length})
        </h2>
        <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface)]">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--bg)]">
                {(
                  [
                    "Date",
                    "Client",
                    "Branch",
                    "Type",
                    "Tech",
                    "Areas",
                    "Issues",
                    "Follow-up",
                    "Client action",
                    "Treatments",
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
              {filtered.map((r) => {
                const products = visitProducts(r);
                return (
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
                    <td className="whitespace-nowrap px-3 py-2.5 text-[var(--ink)]">
                      {VISIT_TYPE_LABELS[r.visitType]}
                    </td>
                    <td className="px-3 py-2.5 text-[var(--ink)]">
                      {r.technicianName}
                    </td>
                    <td className="px-3 py-2.5 text-[var(--ink)]">
                      {r.areas.length}
                    </td>
                    <td className="px-3 py-2.5 text-[var(--ink)]">
                      {visitIssuesCount(r)}
                    </td>
                    <td className="px-3 py-2.5 text-[var(--ink)]">
                      {visitHasAdvice(r, "Follow-up visit required")
                        ? "Yes"
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-[var(--ink)]">
                      {visitHasAdvice(r, "Client action needed") ? "Yes" : "—"}
                    </td>
                    <td
                      className="max-w-[140px] truncate px-3 py-2.5 text-[var(--ink-muted)]"
                      title={products.join(", ") || undefined}
                    >
                      {products.length === 0
                        ? "—"
                        : products.length <= 2
                          ? products.join(", ")
                          : `${products.slice(0, 2).join(", ")} +${products.length - 2}`}
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => openVisit(r.id)}
                        className="min-h-9 rounded-md border border-[var(--line)] px-2.5 text-xs font-semibold text-[var(--accent)]"
                      >
                        View more
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={11}
                    className="px-3 py-10 text-center text-[var(--ink-muted)]"
                  >
                    No reports match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selected && (
        <VisitDetailModal
          record={selected}
          tab={tab}
          onTabChange={setTab}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

function VisitDetailModal({
  record,
  tab,
  onTabChange,
  onClose,
}: {
  record: VisitRecord;
  tab: Tab | null;
  onTabChange: (tab: Tab | null) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const reportBody = generateReportFromRecord(record);

  const summary = useMemo(
    () => ({
      issues: visitIssuesCount(record),
      clean: visitCleanCount(record),
      followUp: visitHasAdvice(record, "Follow-up visit required"),
      clientAction: visitHasAdvice(record, "Client action needed"),
      photos: visitPhotoTotal(record),
      findings: visitUniqueFindings(record),
      pests: visitUniquePests(record),
      treatments: visitTreatmentRows(record),
      advice: visitAdviceFlags(record),
    }),
    [record],
  );

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
        className="relative z-10 flex max-h-[min(90vh,720px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-lg font-semibold text-[var(--ink)]"
            >
              {record.siteName}
            </h2>
            <p className="text-sm text-[var(--ink-muted)]">
              {record.clientName} · {VISIT_TYPE_LABELS[record.visitType]} ·{" "}
              {record.date} · {record.technicianName}
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

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: "Issues", value: String(summary.issues) },
              { label: "Clean", value: String(summary.clean) },
              {
                label: "Follow-up",
                value: summary.followUp ? "Yes" : "No",
              },
              {
                label: "Client action",
                value: summary.clientAction ? "Yes" : "No",
              },
              { label: "Photos", value: String(summary.photos) },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2.5"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                  {s.label}
                </p>
                <p className="mt-0.5 text-lg font-semibold text-[var(--ink)]">
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <CompactList title="Findings" items={summary.findings} />
            <CompactList title="Pests" items={summary.pests} />
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
              Treatments
            </h3>
            <div className="overflow-x-auto rounded-xl border border-[var(--line)]">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)] bg-[var(--bg)]">
                    <th className={th}>Area</th>
                    <th className={th}>Product</th>
                    <th className={th}>Method</th>
                    <th className={th}>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.treatments.map((t, i) => (
                    <tr
                      key={`${t.area}-${t.product}-${i}`}
                      className="border-b border-[var(--line)] last:border-0"
                    >
                      <td className={td}>{t.area}</td>
                      <td className={`${td} font-medium`}>{t.product}</td>
                      <td className={td}>{t.method}</td>
                      <td className={td}>{t.quantity}</td>
                    </tr>
                  ))}
                  {summary.treatments.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-6 text-center text-[var(--ink-muted)]"
                      >
                        No treatments this visit.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <CompactList title="Advice / next steps" items={summary.advice} />

          <div className="flex flex-wrap gap-2 border-t border-[var(--line)] pt-4">
            {(
              [
                ["report", "Full report"],
                ["audit", "Audit detail"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => onTabChange(tab === id ? null : id)}
                className={[
                  "min-h-10 rounded-lg px-3 text-sm font-semibold",
                  tab === id
                    ? "border border-[var(--accent)] text-[var(--accent)] ring-1 ring-[var(--accent)]"
                    : "border border-[var(--line)] text-[var(--ink)]",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "report" && (
            <article className="rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[var(--ink)]">
                {reportBody}
              </pre>
            </article>
          )}

          {tab === "audit" && (
            <div className="overflow-x-auto rounded-xl border border-[var(--line)]">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)] bg-[var(--bg)]">
                    <th className={th}>Area</th>
                    <th className={th}>Status</th>
                    <th className={th}>Findings</th>
                    <th className={th}>Pests</th>
                    <th className={th}>Treatment</th>
                    <th className={th}>Advice</th>
                  </tr>
                </thead>
                <tbody>
                  {record.areas.map((raw) => {
                    const a = normalizeAreaInspection(raw, raw.area);
                    const tx = normalizeTreatment(a.treatment);
                    const treatment =
                      [
                        ...tx.applications.map(formatTreatmentLine),
                        ...tx.serviceActions,
                      ].join("; ") || "—";
                    return (
                      <tr
                        key={a.area}
                        className="border-b border-[var(--line)] last:border-0 align-top"
                      >
                        <td className={`${td} font-medium`}>{a.area}</td>
                        <td className={td}>{a.status ?? "—"}</td>
                        <td className={td}>
                          {a.findings.join(", ") || "—"}
                        </td>
                        <td className={td}>
                          {a.pestTypes.join(", ") || "—"}
                        </td>
                        <td className={td}>{treatment}</td>
                        <td className={td}>
                          {a.advice.join(", ") || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CompactList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
        {title}
      </h3>
      <div className="rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--ink)]">
        {items.length === 0 ? (
          <span className="text-[var(--ink-muted)]">None</span>
        ) : (
          <ul className="list-inside list-disc space-y-1">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const selectClass =
  "min-h-11 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)]";
const th =
  "px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]";
const td = "px-3 py-2.5 text-[var(--ink)]";
