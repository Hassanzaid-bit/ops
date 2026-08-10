"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { visitIssuesCount } from "@/lib/dashboard";
import {
  conduciveLabel,
  evidenceLabel,
  pestTypeLabel,
  THRESHOLD_OPTIONS,
} from "@/lib/ipm";
import { getRecord } from "@/lib/records-store";
import { generateIssuesReportFromRecord } from "@/lib/report";
import {
  isFcuArea,
  isRedDotArea,
  isRodentBaitArea,
  normalizeAreaInspection,
  type AreaInspection,
  type AreaPhoto,
  type DeviceUnit,
  type RedDotAction,
  type SubAreaInspection,
} from "@/lib/types";
import {
  DEVICE_UNIT_ACTIVITY_OPTIONS,
  DEVICE_UNIT_STATUS_OPTIONS,
  fcuCatchLevelLabel,
  formatTreatmentLine,
  VISIT_TYPE_LABELS,
} from "@/lib/vocabulary";
import type { VisitRecord } from "@/lib/visit-record";

export function parseIssueId(
  issueId: string,
): { recordId: string; area: string } | null {
  const decoded = decodeURIComponent(issueId);
  const sep = decoded.indexOf("::");
  if (sep <= 0) return null;
  const recordId = decoded.slice(0, sep);
  const area = decoded.slice(sep + 2);
  if (!recordId || !area) return null;
  return { recordId, area };
}

export function issueDetailHref(recordId: string, area: string): string {
  return `/issues/${encodeURIComponent(`${recordId}::${area}`)}`;
}

function thresholdLabel(id: string | null | undefined): string {
  if (!id) return "";
  return THRESHOLD_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

function activityLabel(id: string | null | undefined): string {
  if (!id) return "";
  return (
    DEVICE_UNIT_ACTIVITY_OPTIONS.find((o) => o.id === id)?.label ?? id
  );
}

function unitStatusLabel(id: string | null | undefined): string {
  if (!id) return "";
  return DEVICE_UNIT_STATUS_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
        {label}
      </p>
      <div className="mt-1 text-sm text-[var(--ink)]">{children}</div>
    </div>
  );
}

function PhotoGrid({ photos, title }: { photos: AreaPhoto[]; title?: string }) {
  if (photos.length === 0) return null;
  return (
    <div className="space-y-2">
      {title && (
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
          {title}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {photos.map((p) => (
          <figure
            key={p.id}
            className="overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--bg)]"
          >
            {/* data URLs — native img is intentional */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.dataUrl}
              alt={p.name || "Evidence photo"}
              className="aspect-square w-full object-cover"
            />
            {p.name ? (
              <figcaption className="truncate px-2 py-1 text-[11px] text-[var(--ink-muted)]">
                {p.name}
              </figcaption>
            ) : null}
          </figure>
        ))}
      </div>
    </div>
  );
}

function SubAreaSection({ sub }: { sub: SubAreaInspection }) {
  const pest = pestTypeLabel(sub.pestType);
  const evidence = evidenceLabel(sub.evidence);
  const conducive = conduciveLabel(sub.conduciveType);
  const threshold = thresholdLabel(sub.thresholdLevel);
  const actions = [
    ...sub.actions,
    ...(sub.actionOther.trim() ? [sub.actionOther.trim()] : []),
  ];
  const recommendation = [
    sub.recommendation,
    sub.recommendationOther.trim(),
  ]
    .filter(Boolean)
    .join(" — ");
  const hasTreatment = Boolean(sub.treatment?.product);

  return (
    <article className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold text-[var(--ink)]">
          {sub.label || "Subarea"}
        </h3>
        <span
          className={[
            "text-xs font-semibold uppercase tracking-wide",
            sub.outcome === "issue"
              ? "text-red-800"
              : sub.outcome === "clean"
                ? "text-[var(--ok)]"
                : "text-[var(--ink-muted)]",
          ].join(" ")}
        >
          {sub.outcome === "issue"
            ? "Issue"
            : sub.outcome === "clean"
              ? "Clean"
              : "—"}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {sub.outcome === "issue" && (
          <>
            {pest && (
              <Field label="Pest">{pest}</Field>
            )}
            {evidence && (
              <Field label="Evidence">{evidence}</Field>
            )}
            {threshold && (
              <Field label="Threshold">{threshold}</Field>
            )}
            {conducive && (
              <Field label="Conducive condition">{conducive}</Field>
            )}
            {sub.foundNote.trim() && (
              <Field label="Finding note" className="sm:col-span-2">
                <p className="whitespace-pre-wrap">{sub.foundNote}</p>
              </Field>
            )}
          </>
        )}
        {actions.length > 0 && (
          <Field label="Action taken" className="sm:col-span-2">
            {actions.join(", ")}
          </Field>
        )}
        {hasTreatment && (
          <Field label="Treatment" className="sm:col-span-2">
            {formatTreatmentLine(sub.treatment)}
          </Field>
        )}
        {recommendation && (
          <Field label="Recommendation" className="sm:col-span-2">
            {recommendation}
          </Field>
        )}
      </div>

      <PhotoGrid photos={sub.photos} title="Issue photos" />
      <PhotoGrid
        photos={sub.recommendationPhotos}
        title="Recommendation photos"
      />
    </article>
  );
}

function DeviceUnitSection({
  unit,
  title,
}: {
  unit: DeviceUnit;
  title?: string;
}) {
  return (
    <article className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
      <h3 className="text-base font-semibold text-[var(--ink)]">
        {title || unit.label || "Unit"}
        {unit.location ? (
          <span className="ml-2 text-sm font-normal text-[var(--ink-muted)]">
            · {unit.location}
          </span>
        ) : null}
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {unit.status && (
          <Field label="Status">{unitStatusLabel(unit.status)}</Field>
        )}
        {unit.activity && (
          <Field label="Activity">{activityLabel(unit.activity)}</Field>
        )}
        {unit.services.length > 0 && (
          <Field label="Services" className="sm:col-span-2">
            {unit.services.join(", ")}
          </Field>
        )}
        {unit.recommendation.trim() && (
          <Field label="Recommendation" className="sm:col-span-2">
            {unit.recommendation}
          </Field>
        )}
        {unit.note.trim() && (
          <Field label="Note" className="sm:col-span-2">
            <p className="whitespace-pre-wrap">{unit.note}</p>
          </Field>
        )}
      </div>
      <PhotoGrid photos={unit.photos} title="Photos" />
    </article>
  );
}

function RedDotActionSection({ action }: { action: RedDotAction }) {
  return (
    <article className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
      <h3 className="text-base font-semibold text-[var(--ink)]">
        {action.location || "Red Dot action"}
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {action.issue.trim() && (
          <Field label="Issue" className="sm:col-span-2">
            {action.issue}
          </Field>
        )}
        {action.note.trim() && (
          <Field label="Note" className="sm:col-span-2">
            <p className="whitespace-pre-wrap">{action.note}</p>
          </Field>
        )}
      </div>
      <PhotoGrid photos={action.photos} title="Photos" />
    </article>
  );
}

function AreaCaptureBody({ area }: { area: AreaInspection }) {
  const isRedDot = isRedDotArea(area.area);
  const isFcu = isFcuArea(area.area);
  const isBait = isRodentBaitArea(area.area);
  const subAreas = area.subAreas ?? [];
  const exceptions = area.deviceService?.units ?? [];
  const redDotActions = area.redDot?.actions ?? [];

  if (isRedDot && area.redDot) {
    const rd = area.redDot;
    return (
      <div className="space-y-4">
        <section className="grid gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:grid-cols-2">
          <Field label="Previous Red Dots found">
            {rd.previousFound === null
              ? "—"
              : rd.previousFound
                ? `Yes${rd.previousCount ? ` · ${rd.previousCount}` : ""}`
                : "No"}
          </Field>
          {rd.previousLocations.trim() && (
            <Field label="Previous locations">{rd.previousLocations}</Field>
          )}
          <Field label="New Red Dots raised">
            {rd.newGapsFound === null
              ? "—"
              : rd.newGapsFound
                ? "Yes"
                : "No"}
          </Field>
          {rd.dotsPlaced !== null && (
            <Field label="Dots placed">
              {rd.dotsPlaced
                ? `Yes${rd.dotsPlacedCount ? ` · ${rd.dotsPlacedCount}` : ""}`
                : "No"}
            </Field>
          )}
          {rd.note.trim() && (
            <Field label="Notes" className="sm:col-span-2">
              <p className="whitespace-pre-wrap">{rd.note}</p>
            </Field>
          )}
        </section>
        {redDotActions.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
              New actions ({redDotActions.length})
            </h2>
            {redDotActions.map((a) => (
              <RedDotActionSection key={a.id} action={a} />
            ))}
          </section>
        )}
      </div>
    );
  }

  if (isFcu || isBait) {
    const ds = area.deviceService;
    return (
      <div className="space-y-4">
        <section className="grid gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:grid-cols-2">
          {ds.count && <Field label="Count">{ds.count}</Field>}
          {ds.actions.length > 0 && (
            <Field label="Services" className="sm:col-span-2">
              {ds.actions.join(", ")}
            </Field>
          )}
          {ds.allOperational !== null && (
            <Field label={isFcu ? "All operational?" : "All good?"}>
              {ds.allOperational ? "Yes" : "No"}
            </Field>
          )}
          {isFcu && ds.catchLevel && (
            <Field label="Catch level">
              {fcuCatchLevelLabel(ds.catchLevel)}
            </Field>
          )}
          {isBait && ds.rodentActivity && (
            <Field label="Rodent activity">
              {activityLabel(ds.rodentActivity)}
            </Field>
          )}
        </section>
        {exceptions.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
              Exceptions ({exceptions.length})
            </h2>
            {exceptions.map((u) => (
              <DeviceUnitSection key={u.id} unit={u} />
            ))}
          </section>
        )}
        <PhotoGrid photos={area.photos} title="Area photos" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {subAreas.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
            Subareas ({subAreas.length})
          </h2>
          {subAreas.map((s) => (
            <SubAreaSection key={s.id} sub={s} />
          ))}
        </section>
      ) : (
        <section className="grid gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:grid-cols-2">
          <Field label="Outcome">
            {area.outcome === "issue"
              ? "Issue"
              : area.outcome === "clean"
                ? "Clean"
                : "—"}
          </Field>
          {area.pestType && (
            <Field label="Pest">{pestTypeLabel(area.pestType)}</Field>
          )}
          {area.evidence && (
            <Field label="Evidence">{evidenceLabel(area.evidence)}</Field>
          )}
          {area.conduciveType && (
            <Field label="Conducive condition">
              {conduciveLabel(area.conduciveType)}
            </Field>
          )}
          {area.issueNote.trim() && (
            <Field label="Issue note" className="sm:col-span-2">
              <p className="whitespace-pre-wrap">{area.issueNote}</p>
            </Field>
          )}
          {area.recommendation.trim() && (
            <Field label="Recommendation" className="sm:col-span-2">
              {area.recommendation}
            </Field>
          )}
          <PhotoGrid photos={area.photos} title="Photos" />
        </section>
      )}
    </div>
  );
}

export function IssueDetail({ issueId }: { issueId: string }) {
  const parsed = useMemo(() => parseIssueId(issueId), [issueId]);
  const [record, setRecord] = useState<VisitRecord | null | undefined>(
    undefined,
  );

  useEffect(() => {
    if (!parsed) {
      setRecord(null);
      return;
    }
    void getRecord(parsed.recordId).then((r) => setRecord(r ?? null));
  }, [parsed]);

  const area = useMemo(() => {
    if (!record || !parsed) return null;
    const raw = record.areas.find(
      (a) => a.area.toLowerCase() === parsed.area.toLowerCase(),
    );
    return raw ? normalizeAreaInspection(raw, raw.area) : null;
  }, [record, parsed]);

  const reportText = useMemo(
    () => (record ? generateIssuesReportFromRecord(record) : ""),
    [record],
  );

  if (record === undefined) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-[var(--ink-muted)]">
        Loading issue…
      </div>
    );
  }

  if (!parsed || !record || !area) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 px-4 pb-16 pt-4">
        <Link
          href="/issues"
          className="inline-flex min-h-10 items-center text-sm font-medium text-[var(--accent-deep)]"
        >
          ← Issues report
        </Link>
        <p className="text-[var(--ink)]">Issue not found.</p>
      </div>
    );
  }

  const issueCount = visitIssuesCount(record);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-4">
      <header className="mb-6 space-y-2">
        <Link
          href="/issues"
          className="inline-flex min-h-10 items-center text-sm font-medium text-[var(--accent-deep)]"
        >
          ← Issues report
        </Link>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-deep)]">
          {VISIT_TYPE_LABELS[record.visitType]} · {record.date}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--ink)]">
          {area.area}
        </h1>
        <p className="text-base text-[var(--ink-muted)]">
          {record.clientName} · {record.siteName}
        </p>
        <p className="text-sm text-[var(--ink-muted)]">
          {record.technicianName}
          {issueCount > 0
            ? ` · ${issueCount} issue area${issueCount === 1 ? "" : "s"} on this visit`
            : ""}
        </p>
      </header>

      <section className="mb-6 grid gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:grid-cols-2">
        <Field label="Findings">
          {area.findings.join(", ") || "—"}
        </Field>
        <Field label="Pests">{area.pestTypes.join(", ") || "—"}</Field>
        <Field label="Advice" className="sm:col-span-2">
          {area.advice.join(", ") || "—"}
        </Field>
        {area.notes.trim() && (
          <Field label="Notes" className="sm:col-span-2">
            <p className="whitespace-pre-wrap">{area.notes}</p>
          </Field>
        )}
        {area.photoCount > 0 && (
          <Field label="Photos">{area.photoCount}</Field>
        )}
      </section>

      <div className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
          Captured details
        </h2>
        <AreaCaptureBody area={area} />
      </div>

      {reportText.trim() && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
            Visit issues report
          </h2>
          <pre className="overflow-auto whitespace-pre-wrap rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 text-sm leading-relaxed text-[var(--ink)]">
            {reportText}
          </pre>
        </section>
      )}
    </div>
  );
}
