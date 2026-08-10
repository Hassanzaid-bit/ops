"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/clients-store";

export function ClientForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [firstBranch, setFirstBranch] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    void createClient({
      name,
      notes,
      firstBranch: firstBranch.trim() || undefined,
    })
      .then((client) => {
        router.push(`/clients/${client.id}`);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not save client.");
        setSubmitting(false);
      });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-12 pt-4">
      <Link
        href="/clients"
        className="text-sm font-semibold text-[var(--accent-deep)]"
      >
        ← Clients
      </Link>

      <header className="mb-6 mt-2">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--ink)]">
          Add client
        </h1>
      </header>

      <form
        onSubmit={submit}
        className="space-y-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5"
      >
        <label className="block space-y-1">
          <span className={labelClass}>Client name</span>
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
          <span className={labelClass}>First branch (optional)</span>
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
          <span className={labelClass}>Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Account notes…"
            className={`${inputClass} resize-y`}
          />
        </label>

        {error && (
          <p className="text-sm font-medium text-red-800" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="min-h-11 rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-ink)] disabled:opacity-50"
          >
            {submitting ? "Creating…" : "Create client"}
          </button>
          <Link
            href="/clients"
            className="inline-flex min-h-11 items-center rounded-lg border border-[var(--line)] px-4 text-sm font-semibold text-[var(--ink)]"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]";

const inputClass =
  "min-h-11 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 text-base outline-none focus:border-[var(--accent)]";
