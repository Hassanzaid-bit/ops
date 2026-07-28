import type { AreaInspection, ScheduledVisit, Site } from "./types";
import {
  isDeviceArea,
  normalizeAreaInspection,
  normalizeTreatment,
  renderPointPhrase,
} from "./types";
import type { VisitRecord } from "./visit-record";
import { formatTreatmentLine, VISIT_TYPE_LABELS } from "./vocabulary";

function bullet(text: string): string {
  const clean = text.replace(/^[•\-\*]\s*/, "").trim();
  return clean ? `• ${clean}` : "";
}

function list(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/** Fully auto IPM bullets from structured capture (schema v2 points) */
function areaSection(raw: AreaInspection): string {
  const insp = normalizeAreaInspection(raw, raw.area);
  const title = (insp.area || "Unspecified").toUpperCase();
  const lines: string[] = [];

  const started = insp.points.filter((p) => p.outcome !== null);
  if (started.length > 0) {
    for (const p of started) {
      const phrase = renderPointPhrase(p);
      if (phrase) lines.push(bullet(phrase));
      if (p.note.trim()) lines.push(bullet(p.note.trim()));
    }
  } else if (insp.status === "clean") {
    lines.push(
      bullet(
        "The area was inspected and found to be clean, orderly, and well maintained.",
      ),
    );
    lines.push(
      bullet("No conditions conducive to pest harbourage were observed."),
    );
  } else if (insp.status === "issues") {
    lines.push(bullet("The area was inspected as part of the IPM programme."));
    if (insp.findings.length) {
      lines.push(
        bullet(`Conditions noted: ${list(insp.findings).toLowerCase()}.`),
      );
    }
    if (insp.pestTypes.length) {
      lines.push(
        bullet(
          `Pest activity related to: ${list(insp.pestTypes).toLowerCase()}.`,
        ),
      );
    }
  } else {
    lines.push(bullet("The area was inspected as part of the IPM programme."));
  }

  if (insp.treatmentApplied !== "none") {
    lines.push(
      bullet(
        `${insp.treatmentApplied === "corrective" ? "Corrective" : "Preventive"} treatment classification applied for this area.`,
      ),
    );
  }

  const treatment = normalizeTreatment(insp.treatment);
  const apps = treatment.applications.filter((a) => a.product);
  for (const app of apps) {
    if (app.product.toLowerCase() === "goliath") {
      lines.push(
        bullet(
          `Preventive Fipronil gel bait (${app.quantity}) was applied using a gel gun as part of the routine IPM programme.`,
        ),
      );
    } else if (app.product.toLowerCase() === "fendona") {
      lines.push(
        bullet(
          `Preventive spray treatment with Fendona (${app.quantity}) was applied at strategic locations as part of the routine IPM programme.`,
        ),
      );
    } else if (app.product.toLowerCase() === "tomcat") {
      lines.push(
        bullet(
          `Rodent baiting with Tomcat (${app.quantity}) was carried out as part of the rodent management programme.`,
        ),
      );
    } else {
      lines.push(bullet(formatTreatmentLine(app)));
    }
  }

  if (insp.deviceService.enabled) {
    const n = insp.deviceService.count || "several";
    const actions = insp.deviceService.actions.length
      ? list(insp.deviceService.actions).toLowerCase()
      : "inspected and serviced";
    if (isDeviceArea(insp.area) || insp.deviceService.enabled) {
      lines.push(
        bullet(
          `${n} unit(s) / station(s) were ${actions} as part of the routine IPM programme.`,
        ),
      );
    }
  }

  const tips = insp.recommendation ? [insp.recommendation] : insp.advice;
  for (const tip of tips) {
    if (tip.toLowerCase().includes("staff advised")) {
      lines.push(
        bullet(
          "Staff were advised to promptly clean food spillages and debris to maintain high sanitation standards and minimise conditions conducive to pest activity.",
        ),
      );
    } else if (tip.toLowerCase().includes("routine cleaning")) {
      lines.push(
        bullet(
          "Continued routine cleaning and servicing are recommended to maintain acceptable hygiene standards.",
        ),
      );
    } else if (tip.toLowerCase().includes("follow-up")) {
      lines.push(bullet("A follow-up visit is recommended for this area."));
    } else if (tip.toLowerCase().includes("client action")) {
      lines.push(
        bullet("Client action is required to address the conditions noted."),
      );
    } else if (tip.toLowerCase().includes("hygiene")) {
      lines.push(
        bullet(
          "Maintaining high hygiene standards is recommended to support effective pest management.",
        ),
      );
    } else if (tip.toLowerCase().includes("monitor")) {
      lines.push(
        bullet(
          tip.endsWith(".")
            ? tip
            : `${tip}.`,
        ),
      );
    } else {
      lines.push(bullet(tip.endsWith(".") ? tip : `${tip}.`));
    }
  }

  if (insp.photoCount > 0) {
    lines.push(bullet(`Photos attached: ${insp.photoCount}.`));
  }

  return `${title}\n${lines.filter(Boolean).join("\n")}`;
}

export function generateReport(
  visit: ScheduledVisit,
  site: Site,
  areas: AreaInspection[],
): string {
  const header = [
    "INTEGRATED PEST MANAGEMENT (IPM) SERVICE REPORT",
    "",
    `Client: ${site.clientName}`,
    `Site: ${site.siteName}`,
    `Visit type: ${VISIT_TYPE_LABELS[visit.visitType]}`,
    `Technician: ${visit.technicianName}`,
    `Date: ${visit.date}`,
    "",
  ].join("\n");

  const normalized = areas.map((a) => normalizeAreaInspection(a, a.area));
  const body =
    normalized.length === 0
      ? "No areas inspected yet."
      : normalized.map(areaSection).join("\n\n");

  return `${header}${body}`.trim();
}

export function generateReportFromRecord(record: VisitRecord): string {
  if (record.reportText.trim()) return record.reportText.trim();
  return generateReport(
    {
      id: record.visitId,
      siteId: record.siteId,
      visitType: record.visitType,
      technicianName: record.technicianName,
      date: record.date,
      status: "submitted",
    },
    {
      id: record.siteId,
      clientName: record.clientName,
      siteName: record.siteName,
      areas: record.areas.map((a) => a.area),
    },
    record.areas,
  );
}

/** Report body limited to areas marked Issues on this visit */
export function generateIssuesReportFromRecord(record: VisitRecord): string {
  const issueAreas = record.areas
    .map((a) => normalizeAreaInspection(a, a.area))
    .filter((a) => a.status === "issues");

  const header = [
    "IPM ISSUES REPORT",
    "",
    `Client: ${record.clientName}`,
    `Site: ${record.siteName}`,
    `Visit type: ${VISIT_TYPE_LABELS[record.visitType]}`,
    `Technician: ${record.technicianName}`,
    `Date: ${record.date}`,
    `Issue areas: ${issueAreas.length}`,
    "",
  ].join("\n");

  if (issueAreas.length === 0) {
    return `${header}No areas were marked as Issues on this visit.`.trim();
  }

  return `${header}${issueAreas.map(areaSection).join("\n\n")}`.trim();
}

export function generateFollowUpsReportFromRecord(record: VisitRecord): string {
  const followUpAreas = record.areas
    .map((a) => normalizeAreaInspection(a, a.area))
    .filter((a) => a.advice.includes("Follow-up visit required"));

  const header = [
    "IPM FOLLOW-UP FLAGS REPORT",
    "",
    `Client: ${record.clientName}`,
    `Site: ${record.siteName}`,
    `Visit type: ${VISIT_TYPE_LABELS[record.visitType]}`,
    `Technician: ${record.technicianName}`,
    `Date: ${record.date}`,
    `Follow-up areas: ${followUpAreas.length}`,
    "",
  ].join("\n");

  if (followUpAreas.length === 0) {
    return `${header}No areas were flagged for follow-up on this visit.`.trim();
  }

  return `${header}${followUpAreas.map(areaSection).join("\n\n")}`.trim();
}

export function generateTreatmentsReportFromRecord(record: VisitRecord): string {
  const treated = record.areas
    .map((a) => normalizeAreaInspection(a, a.area))
    .filter(
      (a) =>
        normalizeTreatment(a.treatment).applications.filter((x) =>
          x.product.trim(),
        ).length > 0,
    );

  const appCount = treated.reduce(
    (sum, a) =>
      sum +
      normalizeTreatment(a.treatment).applications.filter((x) =>
        x.product.trim(),
      ).length,
    0,
  );

  const header = [
    "IPM TREATMENTS REPORT",
    "",
    `Client: ${record.clientName}`,
    `Site: ${record.siteName}`,
    `Visit type: ${VISIT_TYPE_LABELS[record.visitType]}`,
    `Technician: ${record.technicianName}`,
    `Date: ${record.date}`,
    `Treated areas: ${treated.length}`,
    `Applications: ${appCount}`,
    "",
  ].join("\n");

  if (treated.length === 0) {
    return `${header}No chemical treatments were applied on this visit.`.trim();
  }

  return `${header}${treated.map(areaSection).join("\n\n")}`.trim();
}

export function generateInsectramBlock(
  visit: ScheduledVisit,
  site: Site,
  areas: AreaInspection[],
): string {
  const lines = [
    "=== Q ZONE / INSECTRAM PASTE ===",
    `Client: ${site.clientName}`,
    `Branch/Site: ${site.siteName}`,
    `Visit Type: ${VISIT_TYPE_LABELS[visit.visitType]}`,
    `Tech: ${visit.technicianName}`,
    `Date: ${visit.date}`,
    "---",
  ];

  for (const raw of areas) {
    const insp = normalizeAreaInspection(raw, raw.area);
    lines.push(`[${insp.area}]`);
    lines.push(`Status: ${insp.status ?? "-"}`);
    for (const p of insp.points.filter((x) => x.outcome !== null)) {
      lines.push(
        `  Point: ${p.label} | ${p.outcome} | thr=${p.thresholdLevel} | pest=${p.identification.pestType ?? "-"} | action=${p.actionTier}`,
      );
    }
    lines.push(`Findings: ${insp.findings.join(", ") || "-"}`);
    lines.push(`Pests: ${insp.pestTypes.join(", ") || "-"}`);
    const tx = normalizeTreatment(insp.treatment);
    const apps = tx.applications.filter((a) => a.product);
    if (apps.length) {
      for (const app of apps) lines.push(`Tx: ${formatTreatmentLine(app)}`);
    } else {
      lines.push("Tx: -");
    }
    if (insp.deviceService.enabled) {
      lines.push(
        `Devices: ${insp.deviceService.count || "-"} | ${insp.deviceService.actions.join(", ") || "-"}`,
      );
    }
    lines.push(`Advice: ${insp.recommendation || insp.advice.join(", ") || "-"}`);
    lines.push("---");
  }

  lines.push("=== END ===");
  return lines.join("\n");
}

export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
