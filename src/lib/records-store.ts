import type { VisitRecord } from "./visit-record";
import { SEED_RECORDS } from "./seed-records";

const STORE_KEY = "qzone-records";
/** Bump when seed data shape changes so browsers pick up live KFC samples */
const SEEDED_KEY = "qzone-records-seeded-v6";

function readRaw(): VisitRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as VisitRecord[];
  } catch {
    return [];
  }
}

function writeRaw(records: VisitRecord[]) {
  localStorage.setItem(STORE_KEY, JSON.stringify(records));
}

/**
 * Load seed IPM records. On version bump, replace demo seed IDs but keep
 * any technician-submitted records (ids not starting with rec-ipm / rec-hist).
 */
export function ensureSeedRecords(): VisitRecord[] {
  if (typeof window === "undefined") return SEED_RECORDS;
  const existing = readRaw();
  const versionOk = localStorage.getItem(SEEDED_KEY) === "1";

  if (!versionOk) {
    const kept = existing.filter(
      (r) => !r.id.startsWith("rec-ipm-") && !r.id.startsWith("rec-hist-"),
    );
    const merged = mergeById([...SEED_RECORDS, ...kept]);
    writeRaw(merged);
    localStorage.setItem(SEEDED_KEY, "1");
    // clear old flags if present
    localStorage.removeItem("qzone-records-seeded");
    localStorage.removeItem("qzone-records-seeded-v3");
    localStorage.removeItem("qzone-records-seeded-v4");
    localStorage.removeItem("qzone-records-seeded-v5");
    return merged;
  }

  if (existing.length === 0) {
    writeRaw(SEED_RECORDS);
    return SEED_RECORDS;
  }
  return existing;
}

export function listRecords(): VisitRecord[] {
  return ensureSeedRecords().sort((a, b) => b.date.localeCompare(a.date));
}

export function upsertRecord(record: VisitRecord): void {
  const all = ensureSeedRecords();
  const without = all.filter(
    (r) => r.visitId !== record.visitId || r.date !== record.date,
  );
  writeRaw([record, ...without]);
}

export function getRecord(id: string): VisitRecord | undefined {
  return listRecords().find((r) => r.id === id);
}

function mergeById(records: VisitRecord[]): VisitRecord[] {
  const map = new Map<string, VisitRecord>();
  for (const r of records) map.set(r.id, r);
  return [...map.values()];
}
