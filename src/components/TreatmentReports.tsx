"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  treatmentAppRows,
  visitTreatmentsCount,
  type TreatmentAppRow,
} from "@/lib/dashboard";
import { listRecords } from "@/lib/records-store";
import { generateTreatmentsReportFromRecord } from "@/lib/report";
import { normalizeAreaInspection, normalizeTreatment } from "@/lib/types";
import { formatTreatmentLine, VISIT_TYPE_LABELS } from "@/lib/vocabulary";
import { queryRecords, type VisitRecord } from "@/lib/visit-record";
import { RangeFilterBar } from "@/components/RangeFilterBar";

export function TreatmentReports() {
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
  const product = searchParams.get("product") ?? "";

  useEffect(() => {
    setRecords(listRecords());
  }, []);

  useEffect(() => {
    const id = searchParams.get("treatment");
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

  const rows = useMemo(() => {
    const all = treatmentAppRows(filteredRecords);
    if (!product) return all;
    return all.filter((r) => r.product === product);
  }, [filteredRecords, product]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.clientName.toLowerCase().includes(q) ||
        r.siteName.toLowerCase().includes(q) ||
        r.area.toLowerCase().includes(q) ||
        r.product.toLowerCase().includes(q) ||
        r.method.toLowerCase().includes(q) ||
        r.technicianName.toLowerCase().includes(q) ||
        r.date.includes(q),
    );
  }, [rows, query]);

  const selected =
    visible.find((r) => r.id === modalId) ??
    rows.find((r) => r.id === modalId) ??
    null;
  const selectedRecord = selected
    ? (records.find((r) => r.id === selected.recordId) ?? null)
    : null;

  const clients = useMemo(
    () => [...new Set(records.map((r) => r.clientName))].sort(),
    [records],
  );

  const products = useMemo(
    () =>
      [...new Set(treatmentAppRows(filteredRecords).map((r) => r.product))].sort(),
    [filteredRecords],
  );

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function openTreatment(id: string) {
    setModalId(id);
    setParam("treatment", id);
  }

  function closeModal() {
    setModalId(null);
    setParam("treatment", "");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-4">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--ink)]">
          Treatments report
        </h1>
        <p className="mt-2 max-w-xl text-base text-[var(--ink-muted)]">
          Chemical applications across submitted visits — product, method, and
          quantity by area.
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
        <div className="flex flex-wrap gap-3">
          <label className="flex min-w-[10rem] flex-1 items-center gap-2 sm:max-w-[14rem] sm:flex-none">
            <span className="sr-only">Product</span>
            <select
              value={product}
              onChange={(e) => setParam("product", e.target.value)}
              className="min-h-11 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
            >
              <option value="">All products</option>
              {products.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search client, branch, area, product…"
            className="min-h-11 min-w-[12rem] flex-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-base outline-none focus:border-[var(--accent)]"
          />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
          Applications ({visible.length})
        </h2>
        <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface)]">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--bg)]">
                {(
                  [
                    "Date",
                    "Client",
                    "Branch",
                    "Area",
                    "Product",
                    "Method",
                    "Qty",
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
                  <td className="px-3 py-2.5 font-medium text-[var(--ink)]">
                    {r.product}
                  </td>
                  <td className="px-3 py-2.5 text-[var(--ink-muted)]">
                    {r.method}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[var(--ink)]">
                    {r.quantity}
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => openTreatment(r.id)}
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
                    No treatments in this range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selected && selectedRecord && (
        <TreatmentDetailModal
          row={selected}
          record={selectedRecord}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

function TreatmentDetailModal({
  row,
  record,
  onClose,
}: {
  row: TreatmentAppRow;
  record: VisitRecord;
  onClose: () => void;
}) {
  const titleId = useId();
  const area = useMemo(() => {
    const raw = record.areas.find((a) => a.area === row.area);
    return raw ? normalizeAreaInspection(raw, raw.area) : null;
  }, [record, row.area]);
  const reportText = useMemo(
    () => generateTreatmentsReportFromRecord(record),
    [record],
  );
  const treatmentCount = visitTreatmentsCount(record);
  const areaApps = area
    ? normalizeTreatment(area.treatment).applications.filter((x) =>
        x.product.trim(),
      )
    : [];

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
              {row.product}
            </h2>
            <p className="text-sm text-[var(--ink-muted)]">
              {row.clientName} · {row.siteName} · {row.area} · {row.date} ·{" "}
              {VISIT_TYPE_LABELS[row.visitType]}
            </p>
            <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
              {treatmentCount} application{treatmentCount === 1 ? "" : "s"} on
              this visit · {row.technicianName}
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
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                Product
              </p>
              <p className="mt-1 text-sm text-[var(--ink)]">{row.product}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                Quantity
              </p>
              <p className="mt-1 text-sm text-[var(--ink)]">{row.quantity}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                Method
              </p>
              <p className="mt-1 text-sm text-[var(--ink)]">{row.method}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                Active ingredient
              </p>
              <p className="mt-1 text-sm text-[var(--ink)]">
                {row.activeIngredient}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                Antidote
              </p>
              <p className="mt-1 text-sm text-[var(--ink)]">{row.antidote}</p>
            </div>
          </div>

          {areaApps.length > 1 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                All applications in this area
              </p>
              <ul className="space-y-1 text-sm text-[var(--ink)]">
                {areaApps.map((app, i) => (
                  <li key={`${app.product}-${i}`}>
                    {formatTreatmentLine(app)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
              Visit treatments report
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
