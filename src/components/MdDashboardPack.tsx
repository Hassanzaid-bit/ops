"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import {
  actionTierRollups,
  conduciveRollups,
  escalationQueue,
  mdPackKpis,
  pointsForConducive,
  pointsForSite,
  siteSeverityRows,
  toPointFacts,
  type ActionTierRollup,
  type ConduciveRollup,
  type EscalationRow,
  type PointFact,
  type SiteSeverityRow,
} from "@/lib/md-pack";
import {
  actionTierLabel,
  type ConduciveType,
} from "@/lib/ipm";
import type { VisitRecord } from "@/lib/visit-record";

type MdModal =
  | { kind: "severity"; row: SiteSeverityRow }
  | { kind: "conducive"; row: ConduciveRollup }
  | { kind: "tier"; row: ActionTierRollup }
  | { kind: "escalation"; row: EscalationRow };

export function MdDashboardPack({
  records,
  clientActionsHref,
}: {
  records: VisitRecord[];
  clientActionsHref: string;
}) {
  const [modal, setModal] = useState<MdModal | null>(null);
  const points = useMemo(() => toPointFacts(records), [records]);
  const kpis = useMemo(() => mdPackKpis(points), [points]);
  const severity = useMemo(() => siteSeverityRows(records).slice(0, 10), [records]);
  const conducive = useMemo(() => conduciveRollups(points).slice(0, 8), [points]);
  const tiers = useMemo(() => actionTierRollups(points), [points]);
  const escalations = useMemo(
    () => escalationQueue(points).slice(0, 10),
    [points],
  );

  const kpiCards = [
    { label: "Issue points", value: String(kpis.issuePoints) },
    { label: "Moderate / heavy", value: String(kpis.moderateOrHeavy) },
    { label: "Escalations", value: String(kpis.escalations) },
    { label: "Conducive flags", value: String(kpis.conduciveFlags) },
  ];

  return (
    <section className="mb-10 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--ink)]">
            MD dashboard pack
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--ink-muted)]">
            Severity, root-cause conditions, IPM action mix, and escalation
            queue — from inspection-point capture.
          </p>
        </div>
        <Link
          href={clientActionsHref}
          className="text-sm font-semibold text-[var(--accent-deep)]"
        >
          Open client actions →
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((k) => (
          <div
            key={k.label}
            className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
              {k.label}
            </p>
            <p className="mt-1 text-2xl font-semibold text-[var(--ink)]">
              {k.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <MdTable title="Site severity">
          <thead>
            <tr className={thRow}>
              <th className={th}>Client</th>
              <th className={th}>Branch</th>
              <th className={th}>Max</th>
              <th className={th}>H / M / L</th>
              <th className={th}>Issues</th>
            </tr>
          </thead>
          <tbody>
            {severity.map((r) => (
              <tr
                key={r.siteId}
                className={`${tr} cursor-pointer hover:bg-[var(--bg)]/70`}
                onClick={() => setModal({ kind: "severity", row: r })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setModal({ kind: "severity", row: r });
                  }
                }}
                tabIndex={0}
                role="button"
              >
                <td className={td}>{r.clientName}</td>
                <td className={`${td} font-medium`}>{r.siteName}</td>
                <td className={td}>
                  <ThresholdPill level={r.maxThreshold} />
                </td>
                <td className={td}>
                  {r.heavy}/{r.moderate}/{r.light}
                </td>
                <td className={td}>{r.issuePoints}</td>
              </tr>
            ))}
            {severity.length === 0 && <Empty cols={5} />}
          </tbody>
        </MdTable>

        <MdTable title="Conducive conditions">
          <thead>
            <tr className={thRow}>
              <th className={th}>Condition</th>
              <th className={th}>Count</th>
              <th className={th}>Sites</th>
              <th className={th}>Last</th>
            </tr>
          </thead>
          <tbody>
            {conducive.map((r) => (
              <tr
                key={r.type}
                className={`${tr} cursor-pointer hover:bg-[var(--bg)]/70`}
                onClick={() => setModal({ kind: "conducive", row: r })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setModal({ kind: "conducive", row: r });
                  }
                }}
                tabIndex={0}
                role="button"
              >
                <td className={`${td} font-medium`}>{r.label}</td>
                <td className={td}>{r.count}</td>
                <td className={td}>{r.sites}</td>
                <td className={td}>{r.lastDate}</td>
              </tr>
            ))}
            {conducive.length === 0 && <Empty cols={4} />}
          </tbody>
        </MdTable>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <MdTable title="IPM action mix">
          <thead>
            <tr className={thRow}>
              <th className={th}>Action tier</th>
              <th className={th}>Count</th>
              <th className={th}>Share</th>
              <th className={th}>Last</th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((r) => {
              const total = tiers.reduce((s, t) => s + t.count, 0) || 1;
              const pct = Math.round((r.count / total) * 100);
              return (
                <tr
                  key={r.tier}
                  className={`${tr} cursor-pointer hover:bg-[var(--bg)]/70`}
                  onClick={() => setModal({ kind: "tier", row: r })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setModal({ kind: "tier", row: r });
                    }
                  }}
                  tabIndex={0}
                  role="button"
                >
                  <td className={`${td} font-medium`}>{r.label}</td>
                  <td className={td}>{r.count}</td>
                  <td className={td}>{pct}%</td>
                  <td className={td}>{r.lastDate}</td>
                </tr>
              );
            })}
            {tiers.length === 0 && <Empty cols={4} />}
          </tbody>
        </MdTable>

        <MdTable title="Escalation queue">
          <thead>
            <tr className={thRow}>
              <th className={th}>Date</th>
              <th className={th}>Branch</th>
              <th className={th}>Point</th>
              <th className={th}>Level</th>
            </tr>
          </thead>
          <tbody>
            {escalations.map((r) => (
              <tr
                key={r.id}
                className={`${tr} cursor-pointer hover:bg-[var(--bg)]/70`}
                onClick={() => setModal({ kind: "escalation", row: r })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setModal({ kind: "escalation", row: r });
                  }
                }}
                tabIndex={0}
                role="button"
              >
                <td className={td}>{r.date}</td>
                <td className={`${td} font-medium`}>{r.siteName}</td>
                <td className={td}>{r.pointLabel}</td>
                <td className={td}>
                  <ThresholdPill level={r.thresholdLevel} />
                </td>
              </tr>
            ))}
            {escalations.length === 0 && <Empty cols={4} />}
          </tbody>
        </MdTable>
      </div>

      {modal && (
        <MdPackModal
          modal={modal}
          points={points}
          onClose={() => setModal(null)}
        />
      )}
    </section>
  );
}

function MdPackModal({
  modal,
  points,
  onClose,
}: {
  modal: MdModal;
  points: PointFact[];
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

  const detailPoints: PointFact[] =
    modal.kind === "severity"
      ? pointsForSite(points, modal.row.siteId).slice(0, 12)
      : modal.kind === "conducive"
        ? pointsForConducive(
            points,
            modal.row.type as Exclude<ConduciveType, null>,
          ).slice(0, 12)
        : modal.kind === "tier"
          ? points
              .filter(
                (p) => p.outcome === "issue" && p.actionTier === modal.row.tier,
              )
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 12)
          : points
              .filter(
                (p) =>
                  p.recordId === modal.row.id.split("::")[0] &&
                  p.pointId === modal.row.id.split("::")[2] &&
                  p.area === modal.row.area,
              )
              .concat(
                // fallback: match escalation row fields
                points.filter(
                  (p) =>
                    p.siteId === modal.row.siteId &&
                    p.pointLabel === modal.row.pointLabel &&
                    p.date === modal.row.date,
                ),
              )
              .slice(0, 6);

  const title =
    modal.kind === "severity"
      ? modal.row.siteName
      : modal.kind === "conducive"
        ? modal.row.label
        : modal.kind === "tier"
          ? modal.row.label
          : modal.row.pointLabel;

  const subtitle =
    modal.kind === "severity"
      ? `${modal.row.clientName} · severity ${modal.row.maxThreshold}`
      : modal.kind === "conducive"
        ? `${modal.row.count} flags · ${modal.row.sites} site(s)`
        : modal.kind === "tier"
          ? `${modal.row.count} issue point(s)`
          : `${modal.row.clientName} · ${modal.row.siteName} · ${modal.row.date}`;

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

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {modal.kind === "severity" && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MiniStat label="Heavy" value={String(modal.row.heavy)} />
              <MiniStat label="Moderate" value={String(modal.row.moderate)} />
              <MiniStat label="Light" value={String(modal.row.light)} />
              <MiniStat label="Visits" value={String(modal.row.visits)} />
            </div>
          )}

          {modal.kind === "escalation" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <MiniStat label="Threshold" value={modal.row.thresholdLevel} />
              <MiniStat
                label="Action"
                value={actionTierLabel(modal.row.actionTier)}
              />
              <MiniStat label="Pest" value={modal.row.pestType || "—"} />
              <MiniStat
                label="Conducive"
                value={modal.row.conduciveLabel || "—"}
              />
              {modal.row.recommendation && (
                <div className="sm:col-span-2">
                  <MiniStat
                    label="Recommendation"
                    value={modal.row.recommendation}
                  />
                </div>
              )}
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
              Inspection points
            </p>
            {detailPoints.length === 0 ? (
              <p className="text-sm text-[var(--ink-muted)]">
                No point detail in this range.
              </p>
            ) : (
              <ul className="space-y-2">
                {detailPoints.map((p) => (
                  <li
                    key={`${p.recordId}-${p.area}-${p.pointId}-${p.date}`}
                    className="rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm"
                  >
                    <p className="font-medium text-[var(--ink)]">
                      {p.pointLabel}
                      <span className="font-normal text-[var(--ink-muted)]">
                        {" "}
                        · {p.area} · {p.siteName} · {p.date}
                      </span>
                    </p>
                    <p className="mt-0.5 text-[var(--ink-muted)]">
                      {p.thresholdLevel}
                      {p.pestType ? ` · ${p.pestType}` : ""}
                      {p.conduciveLabel ? ` · ${p.conduciveLabel}` : ""}
                      {` · ${actionTierLabel(p.actionTier)}`}
                    </p>
                    {p.note && (
                      <p className="mt-1 text-[var(--ink)]">{p.note}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ThresholdPill({ level }: { level: string }) {
  if (level === "none") {
    return <span className="text-[var(--ink-muted)]">—</span>;
  }
  return (
    <span className="inline-flex rounded-md border border-[var(--line)] px-1.5 py-0.5 text-xs font-semibold capitalize text-[var(--ink)]">
      {level}
    </span>
  );
}

function MdTable({
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
        <table className="w-full min-w-[420px] text-left text-sm">{children}</table>
      </div>
    </div>
  );
}

function Empty({ cols }: { cols: number }) {
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-[var(--ink)]">{value}</p>
    </div>
  );
}

const thRow = "border-b border-[var(--line)] bg-[var(--bg)]";
const th =
  "px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]";
const tr = "border-b border-[var(--line)] last:border-0";
const td = "px-3 py-2.5 text-[var(--ink)]";
