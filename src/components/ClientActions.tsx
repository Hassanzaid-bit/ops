"use client";

import { useEffect, useId, useMemo, useState } from "react";
import {
  CLIENT_ACTION_STATUS_LABELS,
  listClientActions,
  updateClientAction,
  type ClientAction,
  type ClientActionStatus,
} from "@/lib/client-actions";

type StatusFilter = ClientActionStatus | "active" | "all";

export function ClientActions({ embedded = false }: { embedded?: boolean }) {
  const [actions, setActions] = useState<ClientAction[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [query, setQuery] = useState("");
  const [modalId, setModalId] = useState<string | null>(null);

  useEffect(() => {
    setActions(listClientActions());
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return actions.filter((a) => {
      if (statusFilter === "active") {
        if (a.status !== "open" && a.status !== "in_progress") return false;
      } else if (statusFilter !== "all" && a.status !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        a.clientName.toLowerCase().includes(q) ||
        a.siteName.toLowerCase().includes(q) ||
        a.area.toLowerCase().includes(q) ||
        a.findings.some((f) => f.toLowerCase().includes(q))
      );
    });
  }, [actions, statusFilter, query]);

  const selected = actions.find((a) => a.id === modalId) ?? null;

  function refresh() {
    setActions(listClientActions());
  }

  return (
    <div className={embedded ? undefined : "mx-auto max-w-6xl px-4 pb-16 pt-4"}>
      {!embedded && (
        <header className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--ink)]">
            Clients
          </h1>
          <p className="mt-2 max-w-xl text-base text-[var(--ink-muted)]">
            Action queue from visits flagged “Client action needed” — track
            follow-through until done.
          </p>
        </header>
      )}

      <section className="mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search client, branch, area…"
            className="min-h-11 min-w-[12rem] flex-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-base outline-none focus:border-[var(--accent)]"
          />
          <select
            className={selectClass}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="active">Open + in progress</option>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
            <option value="all">All</option>
          </select>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
          Action queue ({filtered.length})
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
                    "Status",
                    "Updated",
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
              {filtered.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--bg)]/70"
                >
                  <td className="whitespace-nowrap px-3 py-2.5 text-[var(--ink)]">
                    {a.date}
                  </td>
                  <td className="px-3 py-2.5 text-[var(--ink)]">
                    {a.clientName}
                  </td>
                  <td className="px-3 py-2.5 font-medium text-[var(--ink)]">
                    {a.siteName}
                  </td>
                  <td className="px-3 py-2.5 text-[var(--ink)]">{a.area}</td>
                  <td
                    className="max-w-[180px] truncate px-3 py-2.5 text-[var(--ink-muted)]"
                    title={a.findings.join(", ") || undefined}
                  >
                    {a.findings.join(", ") || "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusPill status={a.status} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[var(--ink-muted)]">
                    {a.updatedAt.slice(0, 10)}
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => setModalId(a.id)}
                      className="min-h-9 rounded-md border border-[var(--line)] px-2.5 text-xs font-semibold text-[var(--accent)]"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-10 text-center text-[var(--ink-muted)]"
                  >
                    No client actions in this filter. Flag “Client action
                    needed” on a visit area to add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selected && (
        <ActionDetailModal
          action={selected}
          onClose={() => setModalId(null)}
          onSaved={() => {
            refresh();
            setModalId(null);
          }}
        />
      )}
    </div>
  );
}

function ActionDetailModal({
  action,
  onClose,
  onSaved,
}: {
  action: ClientAction;
  onClose: () => void;
  onSaved: () => void;
}) {
  const titleId = useId();
  const [status, setStatus] = useState<ClientActionStatus>(action.status);
  const [note, setNote] = useState(action.note);

  useEffect(() => {
    setStatus(action.status);
    setNote(action.note);
  }, [action]);

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

  function save() {
    updateClientAction(action.id, { status, note: note.trim() });
    onSaved();
  }

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
        className="relative z-10 flex max-h-[min(90vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-lg font-semibold text-[var(--ink)]"
            >
              {action.area}
            </h2>
            <p className="text-sm text-[var(--ink-muted)]">
              {action.clientName} · {action.siteName} · {action.date}
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
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
              Findings
            </p>
            <p className="mt-1 text-sm text-[var(--ink)]">
              {action.findings.join(", ") || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
              Advice
            </p>
            <p className="mt-1 text-sm text-[var(--ink)]">
              {action.advice.join(", ") || "—"}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
              Status
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(
                ["open", "in_progress", "done"] as const
              ).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={[
                    "min-h-10 rounded-lg border px-2 text-sm font-semibold",
                    status === s
                      ? "border-[var(--accent)] text-[var(--accent)] ring-1 ring-[var(--accent)]"
                      : "border-[var(--line)] text-[var(--ink-muted)]",
                  ].join(" ")}
                >
                  {CLIENT_ACTION_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
              Note
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="Follow-up notes, who was contacted, what was agreed…"
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
            />
          </label>
        </div>

        <div className="flex gap-2 border-t border-[var(--line)] p-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 flex-1 rounded-lg border border-[var(--line)] text-sm font-semibold text-[var(--ink)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            className="min-h-11 flex-1 rounded-lg bg-[var(--accent)] text-sm font-semibold text-[var(--accent-ink)]"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: ClientActionStatus }) {
  const styles: Record<ClientActionStatus, string> = {
    open: "bg-[var(--warn-soft)] text-[var(--warn)]",
    in_progress: "bg-[var(--line)] text-[var(--ink)]",
    done: "bg-[var(--ok-soft)] text-[var(--ok)]",
  };
  return (
    <span
      className={`inline-block rounded-md px-2 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {CLIENT_ACTION_STATUS_LABELS[status]}
    </span>
  );
}

const selectClass =
  "min-h-11 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)]";
