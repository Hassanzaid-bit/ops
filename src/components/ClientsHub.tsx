"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { listClients, type Client } from "@/lib/clients-store";
import { listClientActions } from "@/lib/client-actions";
import { listRecords } from "@/lib/records-store";
import { listSites } from "@/lib/ops-store";

export function ClientsHub() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-4">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--ink)]">
          Clients
        </h1>
      </header>

      <ClientsDirectory />
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
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");

  const refresh = useCallback(() => {
    void (async () => {
      const [nextClients, sites, actions, records] = await Promise.all([
        listClients(),
        listSites(),
        listClientActions(),
        listRecords(),
      ]);
      setRows(
        nextClients.map((client) => {
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
        }),
      );
    })();
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

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
        <Link
          href="/clients/new"
          className="ml-auto inline-flex min-h-11 shrink-0 items-center rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-ink)]"
        >
          + Add client
        </Link>
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
                  No clients yet.{" "}
                  <Link
                    href="/clients/new"
                    className="font-semibold text-[var(--accent-deep)]"
                  >
                    Add a client
                  </Link>{" "}
                  to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
