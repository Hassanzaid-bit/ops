import type { VisitRecord } from "./visit-record";
import { apiGet } from "./api-fetch";
import {
  upsertRecordOfflineAware,
  type UpsertRecordResult,
} from "./offline/sync";

export type { UpsertRecordResult };

export async function listRecords(): Promise<VisitRecord[]> {
  return apiGet<VisitRecord[]>("/api/records");
}

export async function upsertRecord(
  record: VisitRecord,
): Promise<UpsertRecordResult> {
  return upsertRecordOfflineAware(record);
}

export async function getRecord(id: string): Promise<VisitRecord | undefined> {
  try {
    return await apiGet<VisitRecord>(`/api/records/${id}`);
  } catch {
    return undefined;
  }
}
