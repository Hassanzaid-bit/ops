"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ClientActions } from "@/components/ClientActions";
import {
  createClient,
  listClients,
  type Client,
} from "@/lib/clients-store";
import { listClientActions } from "@/lib/client-actions";
import { listRecords } from "@/lib/records-store";
import { listSites } from "@/lib/ops-store";

type Tab = "directory" | "actions";

export function ClientsHub() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab: Tab =
    searchParams.get("tab") === "actions" ? "actions" : "directory";

  function setTab(next: Tab) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "actions") params.set("tab", "actions");
    else params.delete("tab");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-4">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--ink)]">
          Clients
        </h1>
        <p className="mt-2 max-w-xl text-base text-[var(--ink-muted)]">
          Account directory and follow-through on visit flags.
        </p>
      </header>

      <div className="mb-5 flex gap-2">
        {(
          [
            ["directory", "Directory"],
            ["actions", "Action queue"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={[
              "min-h-11 rounded-lg px-4 text-sm font-semibold",
              tab === id
                ? "bg-[var(--ink)] text-[var(--bg)]"
                : "border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)]",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "directory" ? <ClientsDirectory /> : <ClientActions embedded />}
    </div>
  );
}

type Row = {
  client: Client;
  branches: number;
  openActions: number;
  lastVisit: string | null;
};

function ClientsDirectory() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(() => {
    setClients(listClients());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const rows = useMemo((): Row[] => {
    const sites = listSites();
    const actions = listClientActions();
    const records = listRecords();
    return clients.map((client) => {
      const clientSites = sites.filter((s) => s.clientName === client.name);
      const openActions = actions.filter(
        (a) =>
          a.clientName === client.name &&
          (a.status === "open" || a.status === "in_progress"),
      ).length;
      const lastVisit =
        records
          .filter((r) => r.clientName === client.name)
          .map((r) => r.date)
          .sort((a, b) => b.localeCompare(a))[0] ?? null;
      return {
        client,
        branches: clientSites.length,
        openActions,
        lastVisit,
      };
    });
  }, [clients]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.client.name.toLowerCase().includes(q) ||
        r.client.notes.toLowerCase().includes(q),
    );
  }, [rows, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search clients…"
          className="min-h-11 min-w-[12rem] flex-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-base outline-none focus:border-[var(--accent)]"
        />
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="min-h-11 rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-ink)]"
        >
          + Add client
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface)]">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] bg-[var(--bg)]">
              {(
                [
                  "Client",
                  "Branches",
                  "Open actions",
                  "Last visit",
                  "Notes",
                  "Actions",
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
            {filtered.map((row) => (
              <tr
                key={row.client.id}
                className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--bg)]/70"
              >
                <td className="px-3 py-2.5 font-medium text-[var(--ink)]">
                  <Link
                    href={`/clients/${row.client.id}`}
                    className="hover:text-[var(--accent)]"
                  >
                    {row.client.name}
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-[var(--ink)]">{row.branches}</td>
                <td className="px-3 py-2.5 text-[var(--ink)]">
                  {row.openActions}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-[var(--ink-muted)]">
                  {row.lastVisit ?? "—"}
                </td>
                <td
                  className="max-w-[220px] truncate px-3 py-2.5 text-[var(--ink-muted)]"
                  title={row.client.notes || undefined}
                >
                  {row.client.notes || "—"}
                </td>
                <td className="px-3 py-2.5">
                  <Link
                    href={`/clients/${row.client.id}`}
                    className="inline-flex min-h-9 items-center rounded-md border border-[var(--line)] px-2.5 text-xs font-semibold text-[var(--accent)]"
                  >
                    View more
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-10 text-center text-[var(--ink-muted)]"
                >
                  No clients yet. Add a client to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {creating && (
        <ClientCreateModal
          onCancel={() => setCreating(false)}
          onSaved={(id) => {
            setCreating(false);
            router.push(`/clients/${id}`);
          }}
        />
      )}
    </div>
  );
}

function ClientCreateModal({
  onCancel,
  onSaved,
}: {
  onCancel: () => void;
  onSaved: (id: string) => void;
}) {
  const titleId = useId();
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [firstBranch, setFirstBranch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [onCancel]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const client = createClient({
        name,
        notes,
        firstBranch: firstBranch.trim() || undefined,
      });
      onSaved(client.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save client.");
    }
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
        onClick={onCancel}
      />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={submit}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
          <h2 id={titleId} className="text-lg font-semibold text-[var(--ink)]">
            Add client
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="min-h-9 shrink-0 rounded-lg px-2 text-sm font-semibold text-[var(--ink-muted)]"
          >
            Close
          </button>
        </div>

        <div className="space-y-3 px-4 py-4">
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
              Client name
            </span>
            <input
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. KFC"
              className={inputClass}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
              First branch (optional)
            </span>
            <input
              value={firstBranch}
              onChange={(e) => setFirstBranch(e.target.value)}
              placeholder="e.g. Kakamega"
              className={inputClass}
            />
            <span className="text-xs text-[var(--ink-muted)]">
              Creates a branch location. Add its checklist on the client screen.
            </span>
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
              Notes
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Account notes…"
              className={`${inputClass} resize-y`}
            />
          </label>

          {error && (
            <p className="text-sm font-medium text-red-800" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--line)] px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-lg border border-[var(--line)] px-4 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="min-h-11 rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-ink)]"
          >
            Create client
          </button>
        </div>
      </form>
    </div>
  );
}

const inputClass =
  "min-h-11 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-base outline-none focus:border-[var(--accent)]";
