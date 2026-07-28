import { listRecords } from "./records-store";
import type { VisitRecord } from "./visit-record";
import { normalizeAreaInspection } from "./types";

export type ClientActionStatus = "open" | "in_progress" | "done";

export type ClientAction = {
  id: string;
  recordId: string;
  visitId: string;
  siteId: string;
  clientName: string;
  siteName: string;
  area: string;
  date: string;
  findings: string[];
  advice: string[];
  status: ClientActionStatus;
  note: string;
  updatedAt: string;
};

const STORE_KEY = "qzone-client-actions";
export const CLIENT_ACTION_LABEL = "Client action needed";

function actionId(recordId: string, area: string): string {
  return `${recordId}::${area}`;
}

function readRaw(): ClientAction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ClientAction[];
  } catch {
    return [];
  }
}

function writeRaw(actions: ClientAction[]) {
  localStorage.setItem(STORE_KEY, JSON.stringify(actions));
}

function flaggedFromRecords(records: VisitRecord[]): Omit<
  ClientAction,
  "status" | "note" | "updatedAt"
>[] {
  const out: Omit<ClientAction, "status" | "note" | "updatedAt">[] = [];
  for (const r of records) {
    for (const raw of r.areas) {
      const a = normalizeAreaInspection(raw, raw.area);
      if (
        !a.advice.includes(CLIENT_ACTION_LABEL) &&
        !a.recommendation.includes(CLIENT_ACTION_LABEL)
      ) {
        continue;
      }
      out.push({
        id: actionId(r.id, a.area),
        recordId: r.id,
        visitId: r.visitId,
        siteId: r.siteId,
        clientName: r.clientName,
        siteName: r.siteName,
        area: a.area,
        date: r.date,
        findings: a.findings,
        advice: a.advice,
      });
    }
  }
  return out;
}

/**
 * Merge visit-derived client-action flags into the local queue.
 * Preserves status/notes for existing ids; creates open items for new flags.
 */
export function syncClientActionsFromRecords(
  records: VisitRecord[] = listRecords(),
): ClientAction[] {
  const existing = readRaw();
  const byId = new Map(existing.map((a) => [a.id, a]));
  const now = new Date().toISOString();
  const flagged = flaggedFromRecords(records);

  for (const f of flagged) {
    const prev = byId.get(f.id);
    if (prev) {
      byId.set(f.id, {
        ...prev,
        ...f,
        status: prev.status,
        note: prev.note,
        updatedAt: prev.updatedAt,
      });
    } else {
      byId.set(f.id, {
        ...f,
        status: "open",
        note: "",
        updatedAt: now,
      });
    }
  }

  const merged = [...byId.values()].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  writeRaw(merged);
  return merged;
}

export function listClientActions(): ClientAction[] {
  return syncClientActionsFromRecords();
}

export function updateClientAction(
  id: string,
  patch: Partial<Pick<ClientAction, "status" | "note">>,
): ClientAction | undefined {
  const all = readRaw();
  const idx = all.findIndex((a) => a.id === id);
  if (idx < 0) return undefined;
  const next: ClientAction = {
    ...all[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  all[idx] = next;
  writeRaw(all);
  return next;
}

export function countOpenClientActions(actions?: ClientAction[]): number {
  const list = actions ?? listClientActions();
  return list.filter(
    (a) => a.status === "open" || a.status === "in_progress",
  ).length;
}

export const CLIENT_ACTION_STATUS_LABELS: Record<ClientActionStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  done: "Done",
};
