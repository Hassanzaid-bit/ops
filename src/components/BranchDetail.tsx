"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BranchChecklistEditor } from "@/components/BranchChecklistEditor";
import { getClient, type Client } from "@/lib/clients-store";
import { getSite, saveSite } from "@/lib/ops-store";
import type { Site } from "@/lib/types";
import { checklistItemCount } from "@/lib/site-checklist";

export function BranchDetail({
  clientId,
  branchId,
}: {
  clientId: string;
  branchId: string;
}) {
  const [client, setClient] = useState<Client | null | undefined>(undefined);
  const [site, setSite] = useState<Site | null | undefined>(undefined);
  const [address, setAddress] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(() => {
    void (async () => {
      const [c, s] = await Promise.all([
        getClient(clientId),
        getSite(branchId),
      ]);
      setClient(c ?? null);
      if (!s || (c && s.clientName !== c.name)) {
        setSite(null);
        return;
      }
      setSite(s);
      setAddress(s.address);
    })();
  }, [clientId, branchId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(t);
  }, [toast]);

  function saveChecklist(next: Site) {
    void saveSite(next).then((saved) => {
      setSite(saved);
      setToast("Checklist saved");
    });
  }

  function saveAddress(e: React.FormEvent) {
    e.preventDefault();
    if (!site) return;
    setSavingAddress(true);
    void saveSite({ ...site, address: address.trim() })
      .then((saved) => {
        setSite(saved);
        setToast("Address saved");
      })
      .finally(() => setSavingAddress(false));
  }

  if (client === undefined || site === undefined) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-[var(--ink-muted)]">
        Loading branch…
      </div>
    );
  }

  if (!client || !site) {
    return (
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-4">
        <Link
          href={`/clients/${clientId}`}
          className="text-sm font-semibold text-[var(--accent-deep)]"
        >
          ← Client
        </Link>
        <p className="mt-6 text-[var(--ink-muted)]">Branch not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-4">
      <Link
        href={`/clients/${clientId}`}
        className="text-sm font-semibold text-[var(--accent-deep)]"
      >
        ← {client.name}
      </Link>

      <header className="mb-6 mt-3">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--ink)]">
          {site.siteName}
        </h1>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          {checklistItemCount(site.checklistAreas)} checklist items
        </p>
      </header>

      <section className="mb-8 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
          Address
        </h2>
        <form onSubmit={saveAddress} className="flex flex-wrap gap-2">
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Branch address"
            className={`${inputClass} min-w-[12rem] flex-1`}
          />
          <button
            type="submit"
            disabled={savingAddress}
            className="min-h-11 rounded-lg border border-[var(--line)] px-4 text-sm font-semibold disabled:opacity-50"
          >
            {savingAddress ? "Saving…" : "Save address"}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5">
        <BranchChecklistEditor site={site} onChange={saveChecklist} />
      </section>

      {toast && (
        <div
          role="status"
          className="pointer-events-none fixed top-4 right-4 z-50 max-w-sm rounded-lg border border-[var(--ok)] bg-[var(--ok-soft)] px-4 py-3 text-sm font-semibold text-[var(--ok)] shadow-[var(--shadow)]"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

const inputClass =
  "min-h-11 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 text-base outline-none focus:border-[var(--accent)]";
