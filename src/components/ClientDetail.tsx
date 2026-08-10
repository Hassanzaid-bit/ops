"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { listClientActions } from "@/lib/client-actions";
import { getClient, type Client } from "@/lib/clients-store";
import { listSites, newId, saveSite } from "@/lib/ops-store";
import { listRecords } from "@/lib/records-store";
import { checklistItemCount } from "@/lib/site-checklist";
import { createKfcChecklist } from "@/lib/kfc-checklist-template";
import type { Site } from "@/lib/types";
import type { ClientAction } from "@/lib/client-actions";
import type { VisitRecord } from "@/lib/visit-record";

export function ClientDetail({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [client, setClient] = useState<Client | null | undefined>(undefined);
  const [branches, setBranches] = useState<Site[]>([]);
  const [actions, setActions] = useState<ClientAction[]>([]);
  const [records, setRecords] = useState<VisitRecord[]>([]);
  const [addingBranch, setAddingBranch] = useState(false);

  const refresh = useCallback(() => {
    void (async () => {
      const c = await getClient(clientId);
      setClient(c ?? null);
      if (!c) {
        setBranches([]);
        setActions([]);
        setRecords([]);
        return;
      }
      const [sites, nextActions, nextRecords] = await Promise.all([
        listSites(),
        listClientActions(),
        listRecords(),
      ]);
      setBranches(
        sites
          .filter((s) => s.clientName === c.name)
          .sort((a, b) => a.siteName.localeCompare(b.siteName)),
      );
      setActions(nextActions);
      setRecords(nextRecords);
    })();
  }, [clientId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openActions = useMemo(() => {
    if (!client) return 0;
    return actions.filter(
      (a) =>
        a.clientName === client.name &&
        (a.status === "open" || a.status === "in_progress"),
    ).length;
  }, [client, actions]);

  const lastVisit = useMemo(() => {
    if (!client) return null;
    return (
      records
        .filter((r) => r.clientName === client.name)
        .map((r) => r.date)
        .sort((a, b) => b.localeCompare(a))[0] ?? null
    );
  }, [client, records]);

  const branchLastVisit = useMemo(() => {
    if (!client) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const r of records) {
      if (r.clientName !== client.name) continue;
      const prev = map.get(r.siteId);
      if (!prev || r.date > prev) map.set(r.siteId, r.date);
    }
    return map;
  }, [client, records]);

  if (client === undefined) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 text-[var(--ink-muted)]">
        Loading client…
      </div>
    );
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
        {client.notes && (
          <p className="mt-2 max-w-xl text-base text-[var(--ink-muted)]">
            {client.notes}
          </p>
        )}
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <Stat label="Branches" value={String(branches.length)} />
        <Stat label="Open actions" value={String(openActions)} />
        <Stat label="Last visit" value={lastVisit ?? "—"} />
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[var(--ink)]">Branches</h2>
          <button
            type="button"
            onClick={() => setAddingBranch(true)}
            className="inline-flex min-h-11 shrink-0 items-center rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-ink)]"
          >
            + Add branch
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface)]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--bg)]">
                {(
                  [
                    "Branch",
                    "Address",
                    "Checklist",
                    "Last visit",
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
              {branches.map((branch) => (
                <tr
                  key={branch.id}
                  className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--bg)]/70"
                >
                  <td className="px-3 py-2.5 font-medium text-[var(--ink)]">
                    <Link
                      href={`/clients/${clientId}/branches/${branch.id}`}
                      className="hover:text-[var(--accent)]"
                    >
                      {branch.siteName}
                    </Link>
                  </td>
                  <td
                    className="max-w-[200px] truncate px-3 py-2.5 text-[var(--ink-muted)]"
                    title={branch.address || undefined}
                  >
                    {branch.address || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-[var(--ink)]">
                    {checklistItemCount(branch.checklistAreas)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[var(--ink-muted)]">
                    {branchLastVisit.get(branch.id) ?? "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/clients/${clientId}/branches/${branch.id}`}
                      className="inline-flex min-h-9 items-center rounded-md border border-[var(--line)] px-2.5 text-xs font-semibold text-[var(--accent)]"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
              {branches.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-10 text-center text-[var(--ink-muted)]"
                  >
                    No branches yet.{" "}
                    <button
                      type="button"
                      onClick={() => setAddingBranch(true)}
                      className="font-semibold text-[var(--accent-deep)]"
                    >
                      Add a branch
                    </button>{" "}
                    to build its checklist.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {addingBranch && (
        <AddBranchModal
          clientName={client.name}
          existingNames={branches.map((b) => b.siteName)}
          onCancel={() => setAddingBranch(false)}
          onSaved={(siteId) => {
            setAddingBranch(false);
            refresh();
            router.push(`/clients/${clientId}/branches/${siteId}`);
          }}
        />
      )}
    </div>
  );
}

function AddBranchModal({
  clientName,
  existingNames,
  onCancel,
  onSaved,
}: {
  clientName: string;
  existingNames: string[];
  onCancel: () => void;
  onSaved: (siteId: string) => void;
}) {
  const titleId = useId();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [useKfcTemplate, setUseKfcTemplate] = useState(
    () => /^kfc\b/i.test(clientName.trim()),
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    const siteName = name.trim();
    if (!siteName) return;
    if (
      existingNames.some(
        (existing) => existing.toLowerCase() === siteName.toLowerCase(),
      )
    ) {
      setError("That branch already exists for this client.");
      return;
    }
    setSubmitting(true);
    const site: Site = {
      id: newId("site"),
      clientName,
      siteName,
      address: address.trim(),
      checklistAreas: useKfcTemplate ? createKfcChecklist() : [],
    };
    void saveSite(site)
      .then((saved) => onSaved(saved.id))
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not save branch.");
        setSubmitting(false);
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
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-[var(--ink)]">
              Add branch
            </h2>
            <p className="text-sm text-[var(--ink-muted)]">{clientName}</p>
          </div>
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
            <span className={labelClass}>Branch name</span>
            <input
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kakamega"
              className={inputClass}
            />
          </label>

          <label className="block space-y-1">
            <span className={labelClass}>Address (optional)</span>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Branch address"
              className={inputClass}
            />
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--line)] px-3 py-3">
            <input
              type="checkbox"
              checked={useKfcTemplate}
              onChange={(e) => setUseKfcTemplate(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-[var(--ink)]">
                Start with KFC IPM checklist
              </span>
              <span className="mt-0.5 block text-xs text-[var(--ink-muted)]">
                Front of house, back of house, external &amp; structure, and
                monitoring devices — editable after creation.
              </span>
            </span>
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
            disabled={submitting}
            className="min-h-11 rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-ink)] disabled:opacity-50"
          >
            {submitting ? "Adding…" : "Add branch"}
          </button>
        </div>
      </form>
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

const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]";

const inputClass =
  "min-h-11 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-base outline-none focus:border-[var(--accent)]";
