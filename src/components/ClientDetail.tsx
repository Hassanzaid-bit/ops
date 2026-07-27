"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { listClientActions } from "@/lib/client-actions";
import { getClient, type Client } from "@/lib/clients-store";
import { listSites, newId, saveSite } from "@/lib/ops-store";
import { listRecords } from "@/lib/records-store";
import type { Site } from "@/lib/types";

export function ClientDetail({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [branches, setBranches] = useState<Site[]>([]);
  const [error, setError] = useState("");
  const [newBranch, setNewBranch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    const c = getClient(clientId);
    setClient(c ?? null);
    if (!c) {
      setBranches([]);
      return;
    }
    const sites = listSites()
      .filter((s) => s.clientName === c.name)
      .sort((a, b) => a.siteName.localeCompare(b.siteName));
    setBranches(sites);
  }, [clientId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openActions = useMemo(() => {
    if (!client) return 0;
    return listClientActions().filter(
      (a) =>
        a.clientName === client.name &&
        (a.status === "open" || a.status === "in_progress"),
    ).length;
  }, [client, branches]);

  const lastVisit = useMemo(() => {
    if (!client) return null;
    return (
      listRecords()
        .filter((r) => r.clientName === client.name)
        .map((r) => r.date)
        .sort((a, b) => b.localeCompare(a))[0] ?? null
    );
  }, [client, branches]);

  const branchLastVisit = useMemo(() => {
    if (!client) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const r of listRecords()) {
      if (r.clientName !== client.name) continue;
      const prev = map.get(r.siteId);
      if (!prev || r.date > prev) map.set(r.siteId, r.date);
    }
    return map;
  }, [client, branches]);

  const selectedBranch =
    branches.find((b) => b.id === expandedId) ?? null;

  function addBranch(e: React.FormEvent) {
    e.preventDefault();
    if (!client) return;
    const siteName = newBranch.trim();
    if (!siteName) return;
    if (
      branches.some((b) => b.siteName.toLowerCase() === siteName.toLowerCase())
    ) {
      setError("That branch already exists for this client.");
      return;
    }
    const site: Site = {
      id: newId("site"),
      clientName: client.name,
      siteName,
      areas: [],
    };
    saveSite(site);
    setNewBranch("");
    setError("");
    refresh();
    setExpandedId(site.id);
  }

  function updateBranch(site: Site) {
    saveSite(site);
    refresh();
  }

  if (!client) {
    return (
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-4">
        <Link
          href="/clients"
          className="text-sm font-semibold text-[var(--accent-deep)]"
        >
          ← Clients
        </Link>
        <p className="mt-6 text-[var(--ink-muted)]">Client not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-4">
      <div className="mb-6">
        <Link
          href="/clients"
          className="text-sm font-semibold text-[var(--accent-deep)]"
        >
          ← Clients
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--ink)]">
          {client.name}
        </h1>
        <p className="mt-2 max-w-xl text-base text-[var(--ink-muted)]">
          Branches and per-branch checklists.
        </p>
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <Stat label="Branches" value={String(branches.length)} />
        <Stat label="Open actions" value={String(openActions)} />
        <Stat label="Last visit" value={lastVisit ?? "—"} />
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-semibold text-[var(--ink)]">
            Branches & checklists
          </h2>
        </div>

        <form onSubmit={addBranch} className="flex flex-wrap gap-2">
          <input
            value={newBranch}
            onChange={(e) => setNewBranch(e.target.value)}
            placeholder="Add branch (e.g. Kakamega)"
            className={`${inputClass} min-w-[12rem] flex-1`}
          />
          <button
            type="submit"
            className="min-h-11 rounded-lg bg-[var(--ink)] px-4 text-sm font-semibold text-[var(--bg)]"
          >
            + Add branch
          </button>
        </form>
        {error && (
          <p className="text-sm font-medium text-red-800" role="alert">
            {error}
          </p>
        )}

        <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface)]">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--bg)]">
                {(
                  ["Branch", "Checklist areas", "Last visit", "Action"] as const
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
              {branches.map((branch) => (
                <tr
                  key={branch.id}
                  className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--bg)]/70"
                >
                  <td className="px-3 py-2.5 font-medium text-[var(--ink)]">
                    {branch.siteName}
                  </td>
                  <td className="px-3 py-2.5 text-[var(--ink)]">
                    {branch.areas.length}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[var(--ink-muted)]">
                    {branchLastVisit.get(branch.id) ?? "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => setExpandedId(branch.id)}
                      className="min-h-9 rounded-md border border-[var(--line)] px-2.5 text-xs font-semibold text-[var(--accent)]"
                    >
                      View checklist
                    </button>
                  </td>
                </tr>
              ))}
              {branches.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-10 text-center text-[var(--ink-muted)]"
                  >
                    No branches yet. Add a branch to start its checklist.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedBranch && (
        <BranchChecklistModal
          key={selectedBranch.id}
          site={selectedBranch}
          onChange={updateBranch}
          onClose={() => setExpandedId(null)}
        />
      )}

      <div className="mt-10">
        <button
          type="button"
          onClick={() => router.push("/clients")}
          className="min-h-11 rounded-lg border border-[var(--line)] px-4 text-sm font-semibold"
        >
          Back to directory
        </button>
      </div>
    </div>
  );
}

function BranchChecklistModal({
  site,
  onChange,
  onClose,
}: {
  site: Site;
  onChange: (site: Site) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const [newArea, setNewArea] = useState("");
  const [toast, setToast] = useState<string | null>(null);

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

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(t);
  }, [toast]);

  function addArea(e: React.FormEvent) {
    e.preventDefault();
    const area = newArea.trim();
    if (!area) return;
    if (site.areas.some((a) => a.toLowerCase() === area.toLowerCase())) {
      setNewArea("");
      return;
    }
    onChange({ ...site, areas: [...site.areas, area] });
    setNewArea("");
    setToast(`Added “${area}” to checklist`);
  }

  function removeArea(area: string) {
    onChange({
      ...site,
      areas: site.areas.filter((a) => a !== area),
    });
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
        className="relative z-10 flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-lg font-semibold text-[var(--ink)]"
            >
              {site.siteName}
            </h2>
            <p className="text-sm text-[var(--ink-muted)]">
              Branch checklist · {site.areas.length} area
              {site.areas.length === 1 ? "" : "s"}
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
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[var(--ink)]">
              Checklist ({site.areas.length})
            </p>
            <form onSubmit={addArea} className="flex gap-2">
              <input
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
                placeholder="Add area (e.g. Grease Trap)"
                className={`${inputClass} flex-1`}
              />
              <button
                type="submit"
                className="min-h-11 rounded-lg bg-[var(--ink)] px-4 text-sm font-semibold text-[var(--bg)]"
              >
                Add
              </button>
            </form>
            <ul className="max-h-72 space-y-1 overflow-auto rounded-lg border border-[var(--line)] p-2">
              {site.areas.map((area) => (
                <li
                  key={area}
                  className="flex items-center justify-between gap-2 rounded-md px-2 py-2 text-sm hover:bg-[var(--bg)]"
                >
                  <span className="text-[var(--ink)]">{area}</span>
                  <button
                    type="button"
                    onClick={() => removeArea(area)}
                    className="text-sm font-semibold text-[var(--ink-muted)]"
                  >
                    Remove
                  </button>
                </li>
              ))}
              {site.areas.length === 0 && (
                <li className="px-2 py-4 text-center text-sm text-[var(--ink-muted)]">
                  No areas yet — add checklist areas for this branch.
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {toast && (
        <div
          role="status"
          className="pointer-events-none fixed top-4 right-4 z-[60] max-w-sm rounded-lg border border-[var(--ok)] bg-[var(--ok-soft)] px-4 py-3 text-sm font-semibold text-[var(--ok)] shadow-[var(--shadow)]"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-[var(--ink)]">{value}</p>
    </div>
  );
}

const inputClass =
  "min-h-11 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-base outline-none focus:border-[var(--accent)]";
