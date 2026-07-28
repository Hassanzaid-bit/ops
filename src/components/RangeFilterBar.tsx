"use client";

import { useState } from "react";

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

type PresetId = "today" | "30" | "90" | "custom";

const PRESETS: {
  id: Exclude<PresetId, "custom">;
  label: string;
}[] = [
  { id: "today", label: "Today" },
  { id: "30", label: "30 days" },
  { id: "90", label: "90 days" },
];

function rangeFor(id: Exclude<PresetId, "custom">): { from: string; to: string } {
  const to = todayISO();
  if (id === "today") return { from: to, to };
  if (id === "30") return { from: daysAgoISO(30), to };
  return { from: daysAgoISO(90), to };
}

function matchPreset(
  from: string,
  to: string,
): Exclude<PresetId, "custom"> | null {
  if (!from || !to) return null;
  for (const id of ["today", "30", "90"] as const) {
    const r = rangeFor(id);
    if (r.from === from && r.to === to) return id;
  }
  return null;
}

function formatShort(iso: string): string {
  if (!iso) return "…";
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function summaryRange(
  active: PresetId,
  from: string,
  to: string,
): string {
  if (active === "today") return "Today";
  if (active === "30") return "Last 30 days";
  if (active === "90") return "Last 90 days";
  if (!from && !to) return "All dates";
  return `${formatShort(from)} – ${formatShort(to)}`;
}

type RangeFilterBarProps = {
  from: string;
  to: string;
  client: string;
  clients: string[];
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onClientChange: (value: string) => void;
  className?: string;
};

export function RangeFilterBar({
  from,
  to,
  client,
  clients,
  onFromChange,
  onToChange,
  onClientChange,
  className = "",
}: RangeFilterBarProps) {
  const [forceCustom, setForceCustom] = useState(false);
  const matched = matchPreset(from, to);
  const active: PresetId =
    forceCustom || !matched ? "custom" : matched;
  const showDates = active === "custom";

  function applyPreset(id: Exclude<PresetId, "custom">) {
    setForceCustom(false);
    const r = rangeFor(id);
    onFromChange(r.from);
    onToChange(r.to);
  }

  function selectCustom() {
    setForceCustom(true);
    if (!from && !to) {
      const r = rangeFor("today");
      onFromChange(r.from);
      onToChange(r.to);
    }
  }

  const chipBase =
    "inline-flex min-h-9 items-center rounded-lg px-3 text-sm font-semibold transition-colors";
  const chipIdle =
    "text-[var(--ink-muted)] hover:bg-[var(--bg)] hover:text-[var(--ink)]";
  const chipActive =
    "bg-[var(--accent)]/10 text-[var(--accent-deep)] ring-1 ring-[var(--accent)]/25";

  return (
    <div
      className={[
        "rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3.5 py-3 shadow-[var(--shadow)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
        <p className="min-w-0 flex-1 text-sm text-[var(--ink)]">
          <span className="font-semibold">{summaryRange(active, from, to)}</span>
          <span className="text-[var(--ink-muted)]">
            {" "}
            · {client || "All clients"}
          </span>
        </p>

        <div
          className="flex flex-wrap items-center gap-1"
          role="group"
          aria-label="Date range"
        >
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id)}
              className={`${chipBase} ${active === p.id ? chipActive : chipIdle}`}
              aria-pressed={active === p.id}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={selectCustom}
            className={`${chipBase} ${active === "custom" ? chipActive : chipIdle}`}
            aria-pressed={active === "custom"}
          >
            Custom
          </button>
        </div>

        <label className="flex min-w-[10rem] flex-1 items-center gap-2 sm:max-w-[14rem] sm:flex-none">
          <span className="sr-only">Client</span>
          <select
            value={client}
            onChange={(e) => onClientChange(e.target.value)}
            className="min-h-9 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
          >
            <option value="">All clients</option>
            {clients.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      {showDates && (
        <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-[var(--line)] pt-3">
          <label className="space-y-1 text-xs font-medium text-[var(--ink-muted)]">
            From
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setForceCustom(true);
                onFromChange(e.target.value);
              }}
              className="mt-1 block min-h-9 rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-[var(--ink-muted)]">
            To
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setForceCustom(true);
                onToChange(e.target.value);
              }}
              className="mt-1 block min-h-9 rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
            />
          </label>
        </div>
      )}
    </div>
  );
}
