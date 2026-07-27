"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchableSelect } from "@/components/SearchableSelect";
import {
  getVisit,
  listSites,
  newId,
  saveVisit,
  todayISO,
} from "@/lib/ops-store";
import {
  listParentVisitOptions,
  type ParentVisitOption,
} from "@/lib/parent-visits";
import type { ScheduledVisit, VisitType } from "@/lib/types";
import { VISIT_TYPE_LABELS } from "@/lib/vocabulary";

export function JobForm({ visitId }: { visitId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNew = !visitId;

  const [hydrated, setHydrated] = useState(false);
  const [existing, setExisting] = useState<ScheduledVisit | null>(null);
  const [sites, setSites] = useState<ReturnType<typeof listSites>>([]);
  const [date, setDate] = useState(todayISO());
  const [siteId, setSiteId] = useState("");
  const [visitType, setVisitType] = useState<VisitType>("full_inspection");
  const [technicianName, setTechnicianName] = useState("");
  const [notes, setNotes] = useState("");
  const [followUpAreas, setFollowUpAreas] = useState<string[]>([]);
  const [parentVisitId, setParentVisitId] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const allSites = listSites();
    setSites(allSites);

    if (visitId) {
      const visit = getVisit(visitId);
      if (!visit) {
        setMissing(true);
        setHydrated(true);
        return;
      }
      setExisting(visit);
      setDate(visit.date);
      setSiteId(visit.siteId);
      setVisitType(visit.visitType);
      setTechnicianName(visit.technicianName);
      setNotes(visit.notes ?? "");
      setFollowUpAreas(visit.followUpAreas ?? []);
      setParentVisitId(visit.parentVisitId ?? "");
    } else {
      const qDate = searchParams.get("date");
      setDate(qDate || todayISO());
      setSiteId(allSites[0]?.id ?? "");
    }
    setHydrated(true);
  }, [visitId, searchParams]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const site = useMemo(
    () => sites.find((s) => s.id === siteId) ?? null,
    [sites, siteId],
  );

  const parentOptions = useMemo(() => {
    if (visitType !== "follow_up") return [] as ParentVisitOption[];
    return listParentVisitOptions({
      siteId: siteId || undefined,
      excludeVisitId: existing?.id,
    });
  }, [visitType, siteId, existing?.id]);

  const selectedParent = parentOptions.find((o) => o.id === parentVisitId);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 text-[var(--ink-muted)]">
        Loading…
      </div>
    );
  }

  if (missing) {
    return (
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-4">
        <Link
          href="/jobs"
          className="text-sm font-semibold text-[var(--accent-deep)]"
        >
          ← Jobs
        </Link>
        <p className="mt-6 text-[var(--ink-muted)]">Job not found.</p>
      </div>
    );
  }

  function onParentChange(id: string) {
    setParentVisitId(id);
    const parent = parentOptions.find((o) => o.id === id);
    if (!parent) return;
    setSiteId(parent.siteId);
    if (parent.issueAreas.length > 0) {
      setFollowUpAreas(parent.issueAreas);
    }
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!siteId) {
      setError("Select a location / branch.");
      return;
    }
    if (!technicianName.trim()) {
      setError("Technician name is required.");
      return;
    }
    if (!date) {
      setError("Date is required.");
      return;
    }
    if (visitType === "follow_up" && !parentVisitId) {
      setError("Link this follow-up to the original visit.");
      return;
    }
    if (visitType === "follow_up" && followUpAreas.length === 0) {
      setError("Pick at least one follow-up area from the checklist.");
      return;
    }

    saveVisit({
      id: existing?.id ?? newId("visit"),
      siteId,
      visitType,
      technicianName: technicianName.trim(),
      date,
      status: existing?.status ?? "scheduled",
      notes: notes.trim() || undefined,
      followUpAreas: visitType === "follow_up" ? followUpAreas : undefined,
      parentVisitId: visitType === "follow_up" ? parentVisitId : undefined,
    });
    setToast(isNew ? "Job created" : "Job saved");
    window.setTimeout(() => {
      router.push("/jobs");
    }, 400);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-12 pt-4">
      <Link
        href="/jobs"
        className="text-sm font-semibold text-[var(--accent-deep)]"
      >
        ← Jobs
      </Link>
      <header className="mb-4 mt-2">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--ink)]">
          {isNew ? "New job" : "Edit job"}
        </h1>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          {isNew
            ? "Schedule a visit for Field Ops."
            : `Update ${VISIT_TYPE_LABELS[visitType].toLowerCase()} details.`}
        </p>
      </header>

      <form
        onSubmit={save}
        className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 sm:p-4"
      >
        <div className="grid gap-2.5 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className={labelClass}>Date</span>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block space-y-1">
            <span className={labelClass}>Visit type</span>
            <select
              value={visitType}
              onChange={(e) => {
                const next = e.target.value as VisitType;
                setVisitType(next);
                if (next !== "follow_up") {
                  setParentVisitId("");
                  setFollowUpAreas([]);
                }
              }}
              className={inputClass}
            >
              <option value="full_inspection">Full Inspection</option>
              <option value="follow_up">Follow-up</option>
            </select>
          </label>
        </div>

        {visitType === "follow_up" && (
          <label className="block space-y-1">
            <span className={labelClass}>Original visit</span>
            <select
              required
              value={parentVisitId}
              onChange={(e) => onParentChange(e.target.value)}
              className={inputClass}
            >
              <option value="">Select original visit…</option>
              {parentOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            {parentOptions.length === 0 && (
              <span className="text-xs text-[var(--ink-muted)]">
                No full inspections found for this branch yet. Add or submit one
                first.
              </span>
            )}
            {selectedParent && selectedParent.issueAreas.length > 0 && (
              <span className="block text-xs text-[var(--ink-muted)]">
                Prefills follow-up areas from issues on that visit (
                {selectedParent.issueAreas.length}).
              </span>
            )}
          </label>
        )}

        {sites.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)]">
            No branches yet. Add a client branch under Clients first.
          </p>
        ) : (
          <>
            <label className="block space-y-1">
              <span className={labelClass}>Branch</span>
              <select
                value={siteId}
                onChange={(e) => {
                  setSiteId(e.target.value);
                  setFollowUpAreas([]);
                  setParentVisitId("");
                }}
                className={inputClass}
                disabled={visitType === "follow_up" && !!parentVisitId}
              >
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.clientName} — {s.siteName} ({s.areas.length} areas)
                  </option>
                ))}
              </select>
            </label>
            {site && (
              <p className="rounded-md border border-[var(--line)] bg-[var(--bg)] px-2.5 py-2 text-xs text-[var(--ink-muted)]">
                <span className="font-semibold text-[var(--ink)]">
                  Checklist · {site.areas.length}
                </span>
                {site.areas.length > 0
                  ? ` — ${site.areas.slice(0, 8).join(", ")}${site.areas.length > 8 ? "…" : ""}`
                  : " — no areas yet"}
              </p>
            )}
            {visitType === "follow_up" && site && site.areas.length > 0 && (
              <SearchableSelect
                label="Follow-up areas"
                options={site.areas}
                selected={followUpAreas}
                onChange={setFollowUpAreas}
                multi
                placeholder="Search areas…"
              />
            )}
          </>
        )}

        <label className="block space-y-1">
          <span className={labelClass}>Technician</span>
          <input
            required
            value={technicianName}
            onChange={(e) => setTechnicianName(e.target.value)}
            className={inputClass}
            placeholder="Technician name"
          />
        </label>

        <label className="block space-y-1">
          <span className={labelClass}>Job notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Access notes, focus areas, client requests…"
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
            disabled={sites.length === 0}
            className="min-h-10 rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-ink)] disabled:opacity-40"
          >
            {isNew ? "Create job" : "Save job"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/jobs")}
            className="min-h-10 rounded-lg border border-[var(--line)] px-4 text-sm font-semibold"
          >
            Cancel
          </button>
        </div>
      </form>

      {toast && (
        <div
          role="status"
          className="fixed top-4 right-4 z-[60] max-w-sm rounded-lg border border-[var(--ok)] bg-[var(--ok-soft)] px-4 py-3 text-sm font-semibold text-[var(--ok)] shadow-[var(--shadow)]"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]";

const inputClass =
  "min-h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]";
