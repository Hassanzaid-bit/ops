import type { VisitRecord } from "@/lib/visit-record";
import { readJson, writeJson } from "./local-storage";

const PENDING_RECORDS_KEY = "pending-records-v1";

export function getPendingRecords(): VisitRecord[] {
  return readJson<VisitRecord[]>(PENDING_RECORDS_KEY, []);
}

export function queueRecord(record: VisitRecord): void {
  const without = getPendingRecords().filter(
    (r) => r.visitId !== record.visitId || r.id !== record.id,
  );
  writeJson(PENDING_RECORDS_KEY, [record, ...without]);
}

export function removePendingRecord(recordId: string): void {
  writeJson(
    PENDING_RECORDS_KEY,
    getPendingRecords().filter((r) => r.id !== recordId),
  );
}

export function hasPendingRecordForVisit(visitId: string): boolean {
  return getPendingRecords().some((r) => r.visitId === visitId);
}
