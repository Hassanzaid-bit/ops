"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import {
  countAdvice,
  dashboardFacts,
  findingCounts,
  followUpAreaRows,
  issueAreaRows,
  issueRate,
  pestRollups,
  productUsageBySite,
  productUsageFromRecords,
  siteRiskRows,
  treatmentAppRows,
  treatmentsAppliedCount,
  type FindingCount,
  type PestRollup,
  type ProductUsage,
  type ProductUsageBySite,
  type SiteRiskRow,
} from "@/lib/dashboard";
import { listRecords } from "@/lib/records-store";
import {
  followUpHotspots,
  queryRecords,
  type AreaFact,
  type FollowUpHotspot,
  type VisitRecord,
} from "@/lib/visit-record";
import { VISIT_TYPE_LABELS } from "@/lib/vocabulary";
import {
  RangeFilterBar,
  todayISO,
} from "@/components/RangeFilterBar";

function reportHref(
  base: "/issues" | "/follow-ups" | "/treatments",
  opts: {
    from?: string;
    to?: string;
    client?: string;
    siteId?: string;
    product?: string;
  },
): string {
  const params = new URLSearchParams();
  if (opts.from) params.set("from", opts.from);
  if (opts.to) params.set("to", opts.to);
  if (opts.client) params.set("client", opts.client);
  if (opts.siteId) params.set("siteId", opts.siteId);
  if (opts.product) params.set("product", opts.product);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

type RiskModal =
  | { kind: "site"; row: SiteRiskRow }
  | { kind: "hotspot"; row: FollowUpHotspot }
  | { kind: "finding"; row: FindingCount }
  | { kind: "pest"; row: PestRollup };

type ChemicalModal =
  | { kind: "product"; row: ProductUsage }
  | { kind: "siteProduct"; row: ProductUsageBySite };

const TONE = {
  risk: {
    ink: "var(--risk)",
    soft: "var(--risk-soft)",
    border: "#e4c8c2",
  },
  warn: {
    ink: "var(--warn)",
    soft: "var(--warn-soft)",
    border: "#e6d4a8",
  },
  info: {
    ink: "var(--info)",
    soft: "var(--info-soft)",
    border: "#c5d8e3",
  },
  chem: {
    ink: "var(--chem)",
    soft: "var(--chem-soft)",
    border: "#cfd8bc",
  },
} as const;

export function Dashboard() {
  const [records, setRecords] = useState<VisitRecord[]>([]);
  const [from, setFrom] = useState(() => todayISO());
  const [to, setTo] = useState(() => todayISO());
  const [client, setClient] = useState("");
  const [riskModal, setRiskModal] = useState<RiskModal | null>(null);
  const [chemicalModal, setChemicalModal] = useState<ChemicalModal | null>(
    null,
  );

  useEffect(() => {
    setRecords([]);
    void listRecords().then(setRecords);
  }, []);

  const clients = useMemo(
    () => [...new Set(records.map((r) => r.clientName))].sort(),
    [records],
  );

  const filtered = useMemo(
    () =>
      queryRecords(records, {
        from,
        to,
        clientName: client || undefined,
      }),
    [records, from, to, client],
  );

  const facts = useMemo(() => dashboardFacts(filtered), [filtered]);
  const riskSites = useMemo(() => siteRiskRows(filtered).slice(0, 12), [filtered]);
  const hotspots = useMemo(
    () => followUpHotspots(filtered).slice(0, 10),
    [filtered],
  );
  const findings = useMemo(() => findingCounts(facts).slice(0, 10), [facts]);
  const pests = useMemo(() => pestRollups(facts).slice(0, 10), [facts]);
  const products = useMemo(
    () => productUsageFromRecords(filtered).slice(0, 12),
    [filtered],
  );
  const bySite = useMemo(
    () => productUsageBySite(filtered).slice(0, 20),
    [filtered],
  );

  const issueFilter = { from, to, client: client || undefined };
  const hasIssues = facts.some((f) => f.status === "issues");
  const followUpsFlagged = countAdvice(facts, "Follow-up visit required");
  const treatmentsApplied = treatmentsAppliedCount(facts);

  const stats = [
    {
      label: "Issue rate",
      value: `${issueRate(facts)}%`,
      href: hasIssues ? reportHref("/issues", issueFilter) : undefined,
      tone: "risk" as const,
    },
    {
      label: "Follow-ups flagged",
      value: String(followUpsFlagged),
      href:
        followUpsFlagged > 0
          ? reportHref("/follow-ups", issueFilter)
          : undefined,
      tone: "warn" as const,
    },
    {
      label: "Client actions",
      value: String(countAdvice(facts, "Client action needed")),
      href: "/clients/actions" as string | undefined,
      tone: "info" as const,
    },
    {
      label: "Treatments applied",
      value: String(treatmentsApplied),
      href:
        treatmentsApplied > 0
          ? reportHref("/treatments", issueFilter)
          : undefined,
      tone: "chem" as const,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-4">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--ink)]">
          Dashboard
        </h1>
        <p className="mt-2 max-w-xl text-base text-[var(--ink-muted)]">
          Client risks and chemical usage from submitted visits.
        </p>
      </header>

      <RangeFilterBar
        className="mb-5"
        from={from}
        to={to}
        client={client}
        clients={clients}
        onFromChange={setFrom}
        onToChange={setTo}
        onClientChange={setClient}
      />

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--line)] px-4 py-12 text-center text-sm text-[var(--ink-muted)]">
          No submitted visits in this range. Complete and submit a visit, or
          widen the dates.
        </div>
      ) : (
        <>
          <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => {
              const tone = TONE[s.tone];
              const body = (
                <>
                  <p
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: tone.ink }}
                  >
                    {s.label}
                  </p>
                  <p
                    className="mt-1 text-2xl font-semibold tracking-tight"
                    style={{ color: tone.ink }}
                  >
                    {s.value}
                  </p>
                </>
              );
              const className = [
                "rounded-xl border px-4 py-3.5 shadow-[var(--shadow)]",
                "href" in s && s.href
                  ? "transition-[border-color,transform] hover:-translate-y-0.5"
                  : "",
              ].join(" ");
              const style = {
                background: tone.soft,
                borderColor: tone.border,
                borderLeftWidth: "3px",
                borderLeftColor: tone.ink,
              } as React.CSSProperties;
              if ("href" in s && s.href) {
                return (
                  <Link
                    key={s.label}
                    href={s.href}
                    className={className}
                    style={style}
                  >
                    {body}
                  </Link>
                );
              }
              return (
                <div key={s.label} className={className} style={style}>
                  {body}
                </div>
              );
            })}
          </div>

          <section className="mb-10 space-y-5">
            <SectionTitle tone="risk">Client risks</SectionTitle>

            <Table title="Highest-risk sites">
              <thead>
                <tr className={thRow}>
                  <th className={th}>Client</th>
                  <th className={th}>Branch</th>
                  <th className={th}>Visits</th>
                  <th className={th}>Issues</th>
                  <th className={th}>Issue %</th>
                  <th className={th}>Follow-ups</th>
                  <th className={th}>Last visit</th>
                </tr>
              </thead>
              <tbody>
                {riskSites.map((r) => (
                  <tr
                    key={r.siteId}
                    className={`${tr} cursor-pointer hover:bg-[var(--bg)]/70`}
                    onClick={() => setRiskModal({ kind: "site", row: r })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setRiskModal({ kind: "site", row: r });
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`View risk details for ${r.siteName}`}
                  >
                    <td className={td}>{r.clientName}</td>
                    <td className={`${td} font-medium`}>{r.siteName}</td>
                    <td className={td}>{r.visits}</td>
                    <td className={td}>{r.issues}</td>
                    <td className={td}>
                      <MetricPill
                        value={`${r.issuePct}%`}
                        level={
                          r.issuePct >= 40
                            ? "high"
                            : r.issuePct >= 20
                              ? "mid"
                              : "low"
                        }
                      />
                    </td>
                    <td className={td}>
                      {r.followUpsFlagged > 0 ? (
                        <MetricPill
                          value={String(r.followUpsFlagged)}
                          level={r.followUpsFlagged >= 3 ? "mid" : "low"}
                          tone="warn"
                        />
                      ) : (
                        "0"
                      )}
                    </td>
                    <td className={td}>{r.lastDate}</td>
                  </tr>
                ))}
                {riskSites.length === 0 && <EmptyRow cols={7} />}
              </tbody>
            </Table>

            <Table title="Follow-up hotspots">
              <thead>
                <tr className={thRow}>
                  <th className={th}>Client</th>
                  <th className={th}>Branch</th>
                  <th className={th}>Area</th>
                  <th className={th}>Count</th>
                  <th className={th}>Last date</th>
                </tr>
              </thead>
              <tbody>
                {hotspots.map((h) => (
                  <tr
                    key={`${h.siteId}-${h.area}`}
                    className={`${tr} cursor-pointer hover:bg-[var(--bg)]/70`}
                    onClick={() => setRiskModal({ kind: "hotspot", row: h })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setRiskModal({ kind: "hotspot", row: h });
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`View follow-up details for ${h.area}`}
                  >
                    <td className={td}>{h.clientName}</td>
                    <td className={`${td} font-medium`}>{h.siteName}</td>
                    <td className={td}>{h.area}</td>
                    <td className={td}>
                      <MetricPill
                        value={String(h.followUpCount)}
                        level={
                          h.followUpCount >= 3
                            ? "high"
                            : h.followUpCount >= 2
                              ? "mid"
                              : "low"
                        }
                        tone="warn"
                      />
                    </td>
                    <td className={td}>{h.lastDate}</td>
                  </tr>
                ))}
                {hotspots.length === 0 && <EmptyRow cols={5} />}
              </tbody>
            </Table>

            <div className="grid gap-5 lg:grid-cols-2">
              <Table title="Top findings">
                <thead>
                  <tr className={thRow}>
                    <th className={th}>Finding</th>
                    <th className={th}>Count</th>
                    <th className={th}>Last</th>
                  </tr>
                </thead>
                <tbody>
                  {findings.map((f) => (
                    <tr
                      key={f.finding}
                      className={`${tr} cursor-pointer hover:bg-[var(--bg)]/70`}
                      onClick={() => setRiskModal({ kind: "finding", row: f })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setRiskModal({ kind: "finding", row: f });
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`View details for ${f.finding}`}
                    >
                      <td className={td}>{f.finding}</td>
                      <td className={td}>
                        <MetricPill
                          value={String(f.count)}
                          level={f.count >= 5 ? "mid" : "low"}
                          tone="info"
                        />
                      </td>
                      <td className={td}>{f.lastDate}</td>
                    </tr>
                  ))}
                  {findings.length === 0 && <EmptyRow cols={3} />}
                </tbody>
              </Table>

              <Table title="Top pests">
                <thead>
                  <tr className={thRow}>
                    <th className={th}>Pest</th>
                    <th className={th}>Count</th>
                    <th className={th}>Last</th>
                  </tr>
                </thead>
                <tbody>
                  {pests.map((p) => (
                    <tr
                      key={p.pestType}
                      className={`${tr} cursor-pointer hover:bg-[var(--bg)]/70`}
                      onClick={() => setRiskModal({ kind: "pest", row: p })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setRiskModal({ kind: "pest", row: p });
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`View details for ${p.pestType}`}
                    >
                      <td className={td}>{p.pestType}</td>
                      <td className={td}>
                        <MetricPill
                          value={String(p.occurrences)}
                          level={p.occurrences >= 5 ? "mid" : "low"}
                          tone="risk"
                        />
                      </td>
                      <td className={td}>{p.lastDate}</td>
                    </tr>
                  ))}
                  {pests.length === 0 && <EmptyRow cols={3} />}
                </tbody>
              </Table>
            </div>
          </section>

          <section className="space-y-5">
            <SectionTitle tone="chem">Chemical usage</SectionTitle>

            <Table title="Product usage">
              <thead>
                <tr className={thRow}>
                  <th className={th}>Product</th>
                  <th className={th}>Applications</th>
                  <th className={th}>Sites</th>
                  <th className={th}>Last used</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr
                    key={p.product}
                    className={`${tr} cursor-pointer hover:bg-[var(--bg)]/70`}
                    onClick={() =>
                      setChemicalModal({ kind: "product", row: p })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setChemicalModal({ kind: "product", row: p });
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`View chemical details for ${p.product}`}
                  >
                    <td className={`${td} font-medium`}>{p.product}</td>
                    <td className={td}>
                      <MetricPill
                        value={String(p.applications)}
                        level={p.applications >= 5 ? "mid" : "low"}
                        tone="chem"
                      />
                    </td>
                    <td className={td}>{p.sitesTouched}</td>
                    <td className={td}>{p.lastDate}</td>
                  </tr>
                ))}
                {products.length === 0 && <EmptyRow cols={4} />}
              </tbody>
            </Table>

            <Table title="Usage by site">
              <thead>
                <tr className={thRow}>
                  <th className={th}>Client</th>
                  <th className={th}>Branch</th>
                  <th className={th}>Product</th>
                  <th className={th}>Applications</th>
                  <th className={th}>Quantities</th>
                </tr>
              </thead>
              <tbody>
                {bySite.map((r) => (
                  <tr
                    key={`${r.siteId}-${r.product}`}
                    className={`${tr} cursor-pointer hover:bg-[var(--bg)]/70`}
                    onClick={() =>
                      setChemicalModal({ kind: "siteProduct", row: r })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setChemicalModal({ kind: "siteProduct", row: r });
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`View ${r.product} usage at ${r.siteName}`}
                  >
                    <td className={td}>{r.clientName}</td>
                    <td className={`${td} font-medium`}>{r.siteName}</td>
                    <td className={td}>{r.product}</td>
                    <td className={td}>{r.applications}</td>
                    <td className={`${td} text-[var(--ink-muted)]`}>
                      {r.quantities}
                    </td>
                  </tr>
                ))}
                {bySite.length === 0 && <EmptyRow cols={5} />}
              </tbody>
            </Table>
          </section>
        </>
      )}

      {riskModal && (
        <ClientRiskModal
          modal={riskModal}
          records={filtered}
          facts={facts}
          filter={issueFilter}
          onClose={() => setRiskModal(null)}
        />
      )}

      {chemicalModal && (
        <ChemicalUsageModal
          modal={chemicalModal}
          records={filtered}
          filter={issueFilter}
          onClose={() => setChemicalModal(null)}
        />
      )}
    </div>
  );
}

function Table({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
        {title}
      </h3>
      <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface)]">
        <table className="w-full min-w-[480px] text-left text-sm">{children}</table>
      </div>
    </div>
  );
}

function EmptyRow({ cols }: { cols: number }) {
  return (
    <tr>
      <td
        colSpan={cols}
        className="px-3 py-8 text-center text-[var(--ink-muted)]"
      >
        No data in this range.
      </td>
    </tr>
  );
}

function ClientRiskModal({
  modal,
  records,
  facts,
  filter,
  onClose,
}: {
  modal: RiskModal;
  records: VisitRecord[];
  facts: AreaFact[];
  filter: { from?: string; to?: string; client?: string };
  onClose: () => void;
}) {
  const titleId = useId();

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

  const siteRecords =
    modal.kind === "site"
      ? records
          .filter((r) => r.siteId === modal.row.siteId)
          .sort((a, b) => b.date.localeCompare(a.date))
      : [];

  const siteIssues =
    modal.kind === "site"
      ? issueAreaRows(siteRecords).slice(0, 8)
      : [];
  const siteFollowUps =
    modal.kind === "site"
      ? followUpAreaRows(siteRecords).slice(0, 8)
      : [];

  const hotspotFacts =
    modal.kind === "hotspot"
      ? facts
          .filter(
            (f) =>
              f.siteId === modal.row.siteId &&
              f.area === modal.row.area &&
              (f.followUpFlagged || f.visitType === "follow_up"),
          )
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 10)
      : [];

  const findingFacts =
    modal.kind === "finding"
      ? facts
          .filter((f) => f.findings.includes(modal.row.finding))
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 12)
      : [];

  const pestFacts =
    modal.kind === "pest"
      ? facts
          .filter((f) => f.pestTypes.includes(modal.row.pestType))
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 12)
      : [];

  const title =
    modal.kind === "site"
      ? modal.row.siteName
      : modal.kind === "hotspot"
        ? modal.row.area
        : modal.kind === "finding"
          ? modal.row.finding
          : modal.row.pestType;

  const subtitle =
    modal.kind === "site"
      ? `${modal.row.clientName} · Highest-risk branch`
      : modal.kind === "hotspot"
        ? `${modal.row.clientName} · ${modal.row.siteName}`
        : modal.kind === "finding"
          ? `Finding · ${modal.row.count} occurrence${modal.row.count === 1 ? "" : "s"}`
          : `Pest · ${modal.row.occurrences} occurrence${modal.row.occurrences === 1 ? "" : "s"}`;

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
              {title}
            </h2>
            <p className="text-sm text-[var(--ink-muted)]">{subtitle}</p>
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
          {modal.kind === "site" && (
            <>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <TextRow label="Client" value={modal.row.clientName} />
                <TextRow label="Branch" value={modal.row.siteName} />
                <TextRow label="Visits" value={String(modal.row.visits)} />
                <TextRow label="Issues" value={String(modal.row.issues)} />
                <TextRow label="Issue %" value={`${modal.row.issuePct}%`} />
                <TextRow
                  label="Follow-ups"
                  value={String(modal.row.followUpsFlagged)}
                />
                <TextRow
                  label="Areas checked"
                  value={String(modal.row.areas)}
                />
                <TextRow label="Last visit" value={modal.row.lastDate} />
              </dl>

              <DetailBlock title="Recent visits">
                {siteRecords.length === 0 ? (
                  <EmptyNote />
                ) : (
                  <ul className="space-y-2">
                    {siteRecords.slice(0, 6).map((r) => (
                      <li
                        key={r.id}
                        className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
                      >
                        <span className="font-medium text-[var(--ink)]">
                          {r.date} · {VISIT_TYPE_LABELS[r.visitType]}
                        </span>
                        <span className="text-[var(--ink-muted)]">
                          {r.technicianName}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </DetailBlock>

              <DetailBlock title="Issue areas">
                {siteIssues.length === 0 ? (
                  <EmptyNote text="No issue areas in this range." />
                ) : (
                  <ul className="space-y-2">
                    {siteIssues.map((r) => (
                      <li key={r.id} className="text-sm text-[var(--ink)]">
                        <span className="font-medium">{r.area}</span>
                        <span className="text-[var(--ink-muted)]">
                          {" "}
                          · {r.date}
                          {r.findings.length
                            ? ` · ${r.findings.slice(0, 2).join(", ")}`
                            : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </DetailBlock>

              <DetailBlock title="Follow-up flags">
                {siteFollowUps.length === 0 ? (
                  <EmptyNote text="No follow-up flags in this range." />
                ) : (
                  <ul className="space-y-2">
                    {siteFollowUps.map((r) => (
                      <li key={r.id} className="text-sm text-[var(--ink)]">
                        <span className="font-medium">{r.area}</span>
                        <span className="text-[var(--ink-muted)]">
                          {" "}
                          · {r.date}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </DetailBlock>

              <div className="flex flex-wrap gap-2">
                {modal.row.issues > 0 && (
                  <Link
                    href={reportHref("/issues", {
                      ...filter,
                      siteId: modal.row.siteId,
                    })}
                    className="min-h-10 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold text-[var(--accent)] inline-flex items-center"
                  >
                    Open issues report
                  </Link>
                )}
                {modal.row.followUpsFlagged > 0 && (
                  <Link
                    href={reportHref("/follow-ups", {
                      ...filter,
                      siteId: modal.row.siteId,
                    })}
                    className="min-h-10 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold text-[var(--accent)] inline-flex items-center"
                  >
                    Open follow-ups report
                  </Link>
                )}
              </div>
            </>
          )}

          {modal.kind === "hotspot" && (
            <>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <TextRow label="Client" value={modal.row.clientName} />
                <TextRow label="Branch" value={modal.row.siteName} />
                <TextRow label="Area" value={modal.row.area} />
                <TextRow
                  label="Follow-up count"
                  value={String(modal.row.followUpCount)}
                />
                <TextRow label="Last flagged" value={modal.row.lastDate} />
              </dl>

              <DetailBlock title="Related visits">
                {hotspotFacts.length === 0 ? (
                  <EmptyNote />
                ) : (
                  <ul className="space-y-2">
                    {hotspotFacts.map((f) => (
                      <li
                        key={`${f.recordId}-${f.date}`}
                        className="text-sm text-[var(--ink)]"
                      >
                        <span className="font-medium">{f.date}</span>
                        <span className="text-[var(--ink-muted)]">
                          {" "}
                          · {VISIT_TYPE_LABELS[f.visitType]} ·{" "}
                          {f.technicianName}
                          {f.followUpFlagged ? " · Follow-up required" : ""}
                        </span>
                        {(f.findings.length > 0 || f.pestTypes.length > 0) && (
                          <p className="mt-0.5 text-[var(--ink-muted)]">
                            {[
                              ...f.findings.slice(0, 2),
                              ...f.pestTypes.slice(0, 2),
                            ].join(" · ")}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </DetailBlock>

              <Link
                href={reportHref("/follow-ups", {
                  ...filter,
                  siteId: modal.row.siteId,
                })}
                className="inline-flex min-h-10 items-center rounded-lg border border-[var(--line)] px-3 text-sm font-semibold text-[var(--accent)]"
              >
                Open follow-ups report
              </Link>
            </>
          )}

          {modal.kind === "finding" && (
            <>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <TextRow label="Finding" value={modal.row.finding} />
                <TextRow
                  label="Occurrences"
                  value={String(modal.row.count)}
                />
                <TextRow label="Last seen" value={modal.row.lastDate} />
              </dl>
              <DetailBlock title="Where it showed up">
                {findingFacts.length === 0 ? (
                  <EmptyNote />
                ) : (
                  <ul className="space-y-2">
                    {findingFacts.map((f) => (
                      <li
                        key={`${f.recordId}-${f.area}`}
                        className="text-sm text-[var(--ink)]"
                      >
                        <span className="font-medium">
                          {f.clientName} · {f.siteName}
                        </span>
                        <span className="text-[var(--ink-muted)]">
                          {" "}
                          · {f.area} · {f.date}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </DetailBlock>
              <Link
                href={reportHref("/issues", filter)}
                className="inline-flex min-h-10 items-center rounded-lg border border-[var(--line)] px-3 text-sm font-semibold text-[var(--accent)]"
              >
                Open issues report
              </Link>
            </>
          )}

          {modal.kind === "pest" && (
            <>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <TextRow label="Pest" value={modal.row.pestType} />
                <TextRow
                  label="Occurrences"
                  value={String(modal.row.occurrences)}
                />
                <TextRow label="Last seen" value={modal.row.lastDate} />
              </dl>
              <DetailBlock title="Where it showed up">
                {pestFacts.length === 0 ? (
                  <EmptyNote />
                ) : (
                  <ul className="space-y-2">
                    {pestFacts.map((f) => (
                      <li
                        key={`${f.recordId}-${f.area}-${f.date}`}
                        className="text-sm text-[var(--ink)]"
                      >
                        <span className="font-medium">
                          {f.clientName} · {f.siteName}
                        </span>
                        <span className="text-[var(--ink-muted)]">
                          {" "}
                          · {f.area} · {f.date}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </DetailBlock>
              <Link
                href={reportHref("/issues", filter)}
                className="inline-flex min-h-10 items-center rounded-lg border border-[var(--line)] px-3 text-sm font-semibold text-[var(--accent)]"
              >
                Open issues report
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ChemicalUsageModal({
  modal,
  records,
  filter,
  onClose,
}: {
  modal: ChemicalModal;
  records: VisitRecord[];
  filter: { from?: string; to?: string; client?: string };
  onClose: () => void;
}) {
  const titleId = useId();

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

  const apps = useMemo(() => {
    const all = treatmentAppRows(records);
    if (modal.kind === "product") {
      return all.filter((r) => r.product === modal.row.product);
    }
    return all.filter(
      (r) =>
        r.product === modal.row.product && r.siteId === modal.row.siteId,
    );
  }, [records, modal]);

  const byBranch = useMemo(() => {
    if (modal.kind !== "product") return [];
    const map = new Map<
      string,
      { siteName: string; clientName: string; count: number; qtys: string[] }
    >();
    for (const a of apps) {
      let row = map.get(a.siteId);
      if (!row) {
        row = {
          siteName: a.siteName,
          clientName: a.clientName,
          count: 0,
          qtys: [],
        };
        map.set(a.siteId, row);
      }
      row.count += 1;
      if (a.quantity !== "—") row.qtys.push(a.quantity);
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [apps, modal.kind]);

  const title =
    modal.kind === "product" ? modal.row.product : modal.row.product;
  const subtitle =
    modal.kind === "product"
      ? `Product usage · ${modal.row.applications} application${modal.row.applications === 1 ? "" : "s"} · ${modal.row.sitesTouched} site${modal.row.sitesTouched === 1 ? "" : "s"}`
      : `${modal.row.clientName} · ${modal.row.siteName}`;

  const reportLink =
    modal.kind === "product"
      ? reportHref("/treatments", {
          ...filter,
          product: modal.row.product,
        })
      : reportHref("/treatments", {
          ...filter,
          product: modal.row.product,
          siteId: modal.row.siteId,
        });

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
              {title}
            </h2>
            <p className="text-sm text-[var(--ink-muted)]">{subtitle}</p>
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
          {modal.kind === "product" ? (
            <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <TextRow label="Product" value={modal.row.product} />
              <TextRow
                label="Applications"
                value={String(modal.row.applications)}
              />
              <TextRow
                label="Sites"
                value={String(modal.row.sitesTouched)}
              />
              <TextRow label="Last used" value={modal.row.lastDate} />
            </dl>
          ) : (
            <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <TextRow label="Client" value={modal.row.clientName} />
              <TextRow label="Branch" value={modal.row.siteName} />
              <TextRow label="Product" value={modal.row.product} />
              <TextRow
                label="Applications"
                value={String(modal.row.applications)}
              />
              <TextRow label="Quantities" value={modal.row.quantities} />
            </dl>
          )}

          {modal.kind === "product" && (
            <DetailBlock title="By branch">
              {byBranch.length === 0 ? (
                <EmptyNote />
              ) : (
                <ul className="space-y-2">
                  {byBranch.map((b) => (
                    <li
                      key={`${b.clientName}-${b.siteName}`}
                      className="text-sm text-[var(--ink)]"
                    >
                      <span className="font-medium">
                        {b.clientName} · {b.siteName}
                      </span>
                      <span className="text-[var(--ink-muted)]">
                        {" "}
                        · {b.count} application{b.count === 1 ? "" : "s"}
                        {b.qtys.length
                          ? ` · ${[...new Set(b.qtys)].slice(0, 3).join(", ")}`
                          : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </DetailBlock>
          )}

          <DetailBlock title="Recent applications">
            {apps.length === 0 ? (
              <EmptyNote text="No applications in this range." />
            ) : (
              <ul className="space-y-2">
                {apps.slice(0, 12).map((a) => (
                  <li key={a.id} className="text-sm text-[var(--ink)]">
                    <span className="font-medium">
                      {a.date} · {a.area}
                    </span>
                    <span className="text-[var(--ink-muted)]">
                      {" "}
                      · {a.siteName} · {a.quantity} · {a.method}
                      {" · "}
                      {VISIT_TYPE_LABELS[a.visitType]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </DetailBlock>

          <Link
            href={reportLink}
            className="inline-flex min-h-10 items-center rounded-lg border border-[var(--line)] px-3 text-sm font-semibold text-[var(--accent)]"
          >
            Open treatments report
          </Link>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: keyof typeof TONE;
}) {
  const t = TONE[tone];
  return (
    <h2 className="flex items-center gap-2.5 text-lg font-semibold text-[var(--ink)]">
      <span
        className="inline-block h-5 w-1.5 rounded-full"
        style={{ background: t.ink }}
        aria-hidden
      />
      {children}
    </h2>
  );
}

function MetricPill({
  value,
  level,
  tone = "risk",
}: {
  value: string;
  level: "low" | "mid" | "high";
  tone?: keyof typeof TONE;
}) {
  const t = TONE[tone];
  if (level === "low") {
    return <span className="text-[var(--ink)]">{value}</span>;
  }
  return (
    <span
      className="inline-flex rounded-md px-2 py-0.5 text-xs font-semibold"
      style={{
        background: t.soft,
        color: t.ink,
      }}
    >
      {value}
    </span>
  );
}

function TextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 text-sm text-[var(--ink)]">
      <dt className="inline font-semibold text-[var(--ink-muted)]">{label}: </dt>
      <dd className="inline">{value}</dd>
    </div>
  );
}

function DetailBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
        {title}
      </p>
      {children}
    </div>
  );
}

function EmptyNote({ text = "No data in this range." }: { text?: string }) {
  return <p className="text-sm text-[var(--ink-muted)]">{text}</p>;
}

const thRow = "border-b border-[var(--line)] bg-[var(--bg)]";
const th =
  "px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]";
const tr = "border-b border-[var(--line)] last:border-0";
const td = "px-3 py-2.5 text-[var(--ink)]";
