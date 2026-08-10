import {
  conduciveLabel,
  evidenceLabel,
  pestTypeLabel,
} from "./ipm";
import type {
  AreaInspection,
  DeviceUnit,
  RedDotUpdate,
  ScheduledVisit,
  Site,
} from "./types";
import {
  isDeviceArea,
  isFcuArea,
  isRedDotArea,
  isRodentBaitArea,
  normalizeAreaInspection,
  normalizeTreatment,
  renderPointPhrase,
} from "./types";
import type { VisitRecord } from "./visit-record";
import {
  deviceUnitActivityLabel,
  deviceUnitStatusLabel,
  fcuCatchLevelLabel,
  formatTreatmentLine,
  VISIT_TYPE_LABELS,
} from "./vocabulary";

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

function numberPhrase(n: number): string {
  const words = [
    "Zero",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
  ];
  return `${words[n] ?? String(n)} (${n})`;
}

function redDotBullets(rd: RedDotUpdate): string[] {
  const lines: string[] = [];
  const actions = rd.actions ?? [];
  const raised = rd.dotsPlaced === true;

  if (rd.previousFound === false) {
    lines.push(
      bullet(
        "No pending Red Dot actions were found from previous services.",
      ),
    );
  } else if (rd.previousFound === true) {
    const count = rd.previousCount.trim();
    const where = rd.previousLocations.trim();
    lines.push(
      bullet(
        `${
          count
            ? `${count} pending Red Dot action(s) from previous services were observed`
            : "Pending Red Dot actions from previous services were observed"
        }${where ? ` at ${where}` : ""}.`,
      ),
    );
  }

  if (!raised) {
    lines.push(
      bullet(
        "No new Red Dot actions were opened during this inspection as all areas were found to be compliant with pest-proofing and hygiene standards.",
      ),
    );
  } else if (actions.length === 0) {
    lines.push(
      bullet(
        "New Red Dot actions were opened during this inspection, marking structural or sanitation issues requiring corrective action.",
      ),
    );
  } else {
    const n = actions.length;
    lines.push(
      bullet(
        `${n} new Red Dot action${n === 1 ? " was" : "s were"} opened during this inspection:`,
      ),
    );
    for (const action of actions) {
      const where = action.location.trim() || "unspecified location";
      const issue = action.issue.trim() || "structural / sanitation issue";
      const note = action.note.trim();
      const photoBit =
        action.photos.length > 0
          ? ` (${action.photos.length} photo${action.photos.length === 1 ? "" : "s"})`
          : "";
      lines.push(
        bullet(
          `${where}: ${issue}${note ? ` — ${note}` : ""}${photoBit}.`,
        ),
      );
    }
  }

  if (rd.note.trim()) lines.push(bullet(rd.note.trim()));
  return lines;
}

function deviceUnitBullet(unit: DeviceUnit): string {
  const name = [unit.label.trim() || "Unit", unit.location.trim()]
    .filter(Boolean)
    .join(" · ");
  const status = deviceUnitStatusLabel(unit.status).toLowerCase();
  const services =
    unit.services.length > 0
      ? list(unit.services).toLowerCase()
      : "inspected";
  let text = `${name} was ${services}`;
  if (unit.status !== "ok") {
    text += ` — status: ${status}`;
  } else {
    text += " and found in good working condition";
  }
  if (unit.note.trim()) text += `. ${unit.note.trim()}`;
  else text += ".";
  return bullet(text);
}

function rodentStationKind(area: string): string {
  const a = area.toLowerCase();
  if (/non-?toxic/.test(a)) return "non-toxic monitoring stations";
  if (/toxic/.test(a)) return "toxic bait stations";
  return "rodent bait stations";
}

function servicesPhrase(services: string[]): string {
  if (services.length === 0) return "inspected";
  const lower = services.map((s) => s.toLowerCase());
  return list(lower);
}

/** Normal areas with subareas → per-subarea narrative beats */
function standardAreaBullets(insp: AreaInspection): string[] {
  const lines: string[] = [];
  const subs = insp.subAreas ?? [];

  if (subs.length > 0) {
    for (const sub of subs) {
      const name = sub.label.trim() || "Subarea";
      if (sub.outcome === "clean") {
        lines.push(
          bullet(
            `The ${name.toLowerCase()} was inspected and found to be clean and well maintained with no evidence of pest activity.`,
          ),
        );
      } else if (sub.outcome === "issue") {
        const bits: string[] = [];
        if (sub.pestType) bits.push(pestTypeLabel(sub.pestType).toLowerCase());
        if (sub.evidence) bits.push(evidenceLabel(sub.evidence).toLowerCase());
        if (sub.thresholdLevel !== "none") {
          bits.push(`${sub.thresholdLevel} activity`);
        }
        if (sub.conduciveType) {
          bits.push(
            conduciveLabel(sub.conduciveType).toLowerCase(),
          );
        }
        lines.push(
          bullet(
            `The ${name.toLowerCase()} was inspected. Findings noted${
              bits.length ? ` — ${bits.join("; ")}` : ""
            }.`,
          ),
        );
        if (sub.foundNote.trim()) {
          lines.push(bullet(sub.foundNote.trim()));
        }
      } else {
        lines.push(bullet(`The ${name.toLowerCase()} was inspected.`));
      }
      {
        const actionBits = [
          ...sub.actions.map((a) => a.toLowerCase()),
          ...(sub.actionOther.trim()
            ? [sub.actionOther.trim()]
            : []),
        ];
        if (actionBits.length > 0) {
          lines.push(bullet(`Action taken: ${list(actionBits)}.`));
        }
        const rx = sub.treatment;
        if (rx?.product?.trim()) {
          const bits = [
            `Product: ${rx.product}`,
            rx.method ? `Method: ${rx.method}` : "",
            rx.activeIngredient
              ? `Active ingredient: ${rx.activeIngredient}`
              : "",
            rx.antidote ? `Antidote: ${rx.antidote}` : "",
          ].filter(Boolean);
          lines.push(
            bullet(
              `Chemical applied at ${name.toLowerCase()}: ${bits.join(" | ")}.`,
            ),
          );
        }
      }
      {
        const tips = [
          sub.recommendation.trim(),
          sub.recommendationOther.trim(),
        ].filter(Boolean);
        for (const tip of tips) {
          lines.push(bullet(tip.endsWith(".") ? tip : `${tip}.`));
        }
      }
    }
    return lines;
  }

  // Legacy area-level Clean-first
  const name = insp.area.trim() || "This area";
  const services =
    insp.services.length > 0
      ? servicesPhrase(insp.services)
      : "inspected";
  if (insp.outcome === "clean") {
    lines.push(
      bullet(
        `A comprehensive inspection was carried out in the ${name.toLowerCase()}. The area was ${services} as part of the IPM programme.`,
      ),
    );
    lines.push(
      bullet(
        "The area was found to be clean, orderly, and well maintained with no evidence of pest activity.",
      ),
    );
  } else if (insp.outcome === "issue") {
    lines.push(
      bullet(
        `The ${name.toLowerCase()} was ${services} as part of the IPM programme.`,
      ),
    );
    const bits: string[] = [];
    if (insp.pestType) bits.push(pestTypeLabel(insp.pestType).toLowerCase());
    if (insp.evidence) bits.push(evidenceLabel(insp.evidence).toLowerCase());
    if (insp.thresholdLevel !== "none") {
      bits.push(`${insp.thresholdLevel} activity`);
    }
    if (insp.conduciveType) {
      bits.push(
        `conducive condition: ${conduciveLabel(insp.conduciveType).toLowerCase()}`,
      );
    }
    if (bits.length > 0) {
      lines.push(bullet(`Findings noted — ${bits.join("; ")}.`));
    }
    if (insp.issueNote.trim()) lines.push(bullet(insp.issueNote.trim()));
  }

  return lines;
}

function rodentBaitBullets(insp: AreaInspection): string[] {
  const device = insp.deviceService;
  const lines: string[] = [];
  const nRaw = parseInt(device.count, 10);
  const n = Number.isFinite(nRaw) ? nRaw : 0;
  const countLabel = n > 0 ? numberPhrase(n) : device.count || "Several";
  const kind = rodentStationKind(insp.area);
  const services = servicesPhrase(device.actions);

  let lead = `${countLabel} ${kind} were ${services}`;
  if (device.allOperational === true) {
    lead +=
      " and found to be in good condition without any mechanical damage";
  }
  lead += ".";
  lines.push(bullet(lead));

  for (const unit of device.units ?? []) {
    const stationNo = unit.label.trim();
    const where = unit.location.trim();
    const name = [
      stationNo ? `Station ${stationNo}` : "Station",
      where,
    ]
      .filter(Boolean)
      .join(" · ");
    const status = deviceUnitStatusLabel(unit.status).toLowerCase();
    const bits: string[] = [`status: ${status}`];
    if (unit.activity && unit.activity !== "none") {
      bits.push(
        `activity: ${deviceUnitActivityLabel(unit.activity).toLowerCase()}`,
      );
    }
    if (unit.note.trim()) bits.push(unit.note.trim());
    lines.push(bullet(`${name} — ${bits.join("; ")}.`));
    const tip = unit.recommendation.trim();
    if (tip) {
      lines.push(bullet(tip.endsWith(".") ? tip : `${tip}.`));
    }
  }

  if (device.rodentActivity === "none") {
    lines.push(
      bullet(
        "No evidence of rodent feeding, droppings, or other rodent activity was observed, confirming that the current rodent management programme remains effective.",
      ),
    );
  } else if (device.rodentActivity) {
    lines.push(
      bullet(
        `Rodent activity (${deviceUnitActivityLabel(device.rodentActivity).toLowerCase()}) was observed during the inspection.`,
      ),
    );
  }

  return lines;
}

function fcuBullets(insp: AreaInspection): string[] {
  const device = insp.deviceService;
  const lines: string[] = [];
  const nRaw = parseInt(device.count, 10);
  const n = Number.isFinite(nRaw) ? nRaw : 0;
  const countLabel = n > 0 ? numberPhrase(n) : device.count || "Several";
  const services = servicesPhrase(device.actions);

  let lead = `${countLabel} Fly Control Units were ${services}`;
  if (device.allOperational === true) {
    lead += " and found to be in good condition and fully operational";
  }
  lead += ".";
  lines.push(bullet(lead));

  if (device.actions.some((a) => /glue board/i.test(a))) {
    lines.push(
      bullet(
        "New glue boards were installed to maintain effective flying insect monitoring and control.",
      ),
    );
  }

  if (device.catchLevel === "low") {
    lines.push(
      bullet(
        "The fly catch count since the last service was found to be within the low classification.",
      ),
    );
  } else if (device.catchLevel === "light_boards") {
    lines.push(
      bullet(
        "A light infestation of flying insects was observed on the glueboards, indicating that the units are functioning effectively.",
      ),
    );
  } else if (device.catchLevel === "medium") {
    lines.push(
      bullet(
        "The fly catch count since the last service was found to be within the medium classification.",
      ),
    );
  } else if (device.catchLevel === "high") {
    lines.push(
      bullet(
        "The fly catch count since the last service was elevated and requires attention.",
      ),
    );
  }

  for (const unit of device.units ?? []) {
    const fcuNo = unit.label.trim();
    const where = unit.location.trim();
    const status = deviceUnitStatusLabel(unit.status).toLowerCase();
    let text = fcuNo
      ? `Fly Control Unit ${fcuNo}${where ? ` located at the ${where}` : ""} was found ${status}`
      : `The Fly Control Unit${where ? ` located at the ${where}` : ""} was found ${status}`;
    if (unit.note.trim()) text += ` — ${unit.note.trim()}`;
    text += ".";
    lines.push(bullet(text));
    const tip = unit.recommendation.trim();
    if (tip) {
      lines.push(bullet(tip.endsWith(".") ? tip : `${tip}.`));
    }
  }

  return lines;
}

function deviceServiceBullets(insp: AreaInspection): string[] {
  if (!insp.deviceService.enabled) return [];
  const units = insp.deviceService.units ?? [];
  const lines: string[] = [];

  if (units.length > 0) {
    const rollupActions =
      insp.deviceService.actions.length > 0
        ? list(insp.deviceService.actions).toLowerCase()
        : "inspected, cleaned, and serviced";
    lines.push(
      bullet(
        `${numberPhrase(units.length)} unit(s) / station(s) were ${rollupActions} as part of the routine IPM programme.`,
      ),
    );
    for (const unit of units) {
      if (unit.status !== "ok" || unit.note.trim()) {
        lines.push(deviceUnitBullet(unit));
      }
    }
    return lines;
  }

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
  return lines;
}

/** Fully auto IPM bullets from structured capture (schema v2 points) */
function areaSection(raw: AreaInspection): string {
  const insp = normalizeAreaInspection(raw, raw.area);
  const title = isRedDotArea(insp.area)
    ? "RED DOT UPDATE"
    : (insp.area || "Unspecified").toUpperCase();
  const lines: string[] = [];

  if (isRedDotArea(insp.area) && insp.redDot) {
    lines.push(...redDotBullets(insp.redDot));
    const tips = insp.recommendation ? [insp.recommendation] : insp.advice;
    for (const tip of tips) {
      if (!tip.trim()) continue;
      lines.push(bullet(tip.endsWith(".") ? tip : `${tip}.`));
    }
    if (insp.photoCount > 0) {
      lines.push(bullet(`Photos attached: ${insp.photoCount}.`));
    }
    return `${title}\n${lines.filter(Boolean).join("\n")}`;
  }

  if (isRodentBaitArea(insp.area)) {
    lines.push(...rodentBaitBullets(insp));
    if (insp.photoCount > 0) {
      lines.push(bullet(`Photos attached: ${insp.photoCount}.`));
    }
    return `${title}\n${lines.filter(Boolean).join("\n")}`;
  }

  if (isFcuArea(insp.area)) {
    lines.push(...fcuBullets(insp));
    const tips = insp.recommendation ? [insp.recommendation] : insp.advice;
    for (const tip of tips) {
      if (!tip.trim()) continue;
      if (
        tip.toLowerCase().includes("programme is effective") &&
        lines.some((l) => l.toLowerCase().includes("functioning effectively"))
      ) {
        continue;
      }
      lines.push(bullet(tip.endsWith(".") ? tip : `${tip}.`));
    }
    if (insp.photoCount > 0) {
      lines.push(bullet(`Photos attached: ${insp.photoCount}.`));
    }
    return `${title}\n${lines.filter(Boolean).join("\n")}`;
  }

  if ((insp.subAreas?.length ?? 0) > 0 || insp.outcome !== null) {
    lines.push(...standardAreaBullets(insp));
  } else {
    const started = insp.points.filter((p) => p.outcome !== null);
    if (started.length > 0) {
      if (started.length > 1) {
        const scope = list(started.map((p) => p.label));
        lines.push(
          bullet(
            `Upon inspection, the following were thoroughly examined: ${scope}.`,
          ),
        );
      }
      for (const p of started) {
        const phrase = renderPointPhrase(p);
        if (phrase) lines.push(bullet(phrase));
        if (p.note.trim()) lines.push(bullet(p.note.trim()));
      }
      if (
        started.every((p) => p.outcome === "clean") &&
        started.length > 0
      ) {
        lines.push(
          bullet(
            "No signs of pest activity, droppings, or harbourage were detected in the sections examined.",
          ),
        );
      }
    } else if (!(isRedDotArea(insp.area) && insp.redDot)) {
      if (insp.status === "clean") {
        lines.push(
          bullet(
            "The area was inspected and found to be clean, orderly, and well maintained.",
          ),
        );
        lines.push(
          bullet("No conditions conducive to pest harbourage were observed."),
        );
      } else if (insp.status === "issues") {
        lines.push(
          bullet("The area was inspected as part of the IPM programme."),
        );
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
        lines.push(
          bullet("The area was inspected as part of the IPM programme."),
        );
      }
    }
  }

  const subHasChemical = (insp.subAreas ?? []).some((s) =>
    Boolean(s.treatment?.product?.trim()),
  );

  if (!subHasChemical && insp.treatmentApplied !== "none") {
    lines.push(
      bullet(
        `${insp.treatmentApplied === "corrective" ? "Corrective" : "Preventive"} treatment classification applied for this area.`,
      ),
    );
  }

  // Subarea chemicals are already written above; avoid duplicating area roll-up
  if (!subHasChemical) {
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
  }

  lines.push(...deviceServiceBullets(insp));

  // Subareas already emit their own recommendations
  const tips =
    (insp.subAreas?.length ?? 0) > 0
      ? []
      : insp.recommendation
        ? [insp.recommendation]
        : insp.advice;
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
  const crewNote =
    visit.assignmentMode === "team" && (visit.teamMemberIds?.length ?? 0) > 1
      ? `Assignment: Team (lead ${visit.technicianName}, ${visit.teamMemberIds!.length} PMPs)`
      : `Technician: ${visit.technicianName}`;

  const header = [
    "INTEGRATED PEST MANAGEMENT (IPM) SERVICE REPORT",
    "",
    `Client: ${site.clientName}`,
    `Site: ${site.siteName}`,
    `Visit type: ${VISIT_TYPE_LABELS[visit.visitType]}`,
    crewNote,
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
      address: "",
      checklistAreas: [],
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
      const units = insp.deviceService.units ?? [];
      if (units.length > 0) {
        lines.push(`Devices: ${units.length} unit(s)`);
        for (const u of units) {
          lines.push(
            `  ${u.label}${u.location ? ` @ ${u.location}` : ""} | ${u.status} | ${u.services.join(", ") || "-"}`,
          );
        }
      } else {
        lines.push(
          `Devices: ${insp.deviceService.count || "-"} | ${insp.deviceService.actions.join(", ") || "-"}`,
        );
      }
    }
    if (insp.redDot) {
      lines.push(
        `RedDot: prev=${String(insp.redDot.previousFound)} new=${String(insp.redDot.dotsPlaced)} actions=${insp.redDot.actions?.length ?? 0}`,
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
