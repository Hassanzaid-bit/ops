import { apiGet, apiSend } from "@/lib/api-fetch";
import type { VisitDraft } from "@/lib/types";
import type { VisitRecord } from "@/lib/visit-record";
import {
  clearDraftPendingClear,
  clearDraftPendingSync,
  clearLocalDraft,
  getPendingDraftClears,
  getPendingDraftIds,
  markDraftPendingClear,
  markDraftPendingSync,
  readLocalDraft,
  writeLocalDraft,
} from "./draft-local";
import { isBrowserOnline } from "./local-storage";
import {
  getPendingRecords,
  queueRecord,
  removePendingRecord,
} from "./record-queue";

export const SYNC_STATUS_EVENT = "qzone-sync-status";

export type SyncStatus = {
  online: boolean;
  pendingDrafts: number;
  pendingRecords: number;
  syncing: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
};

let syncing = false;
let lastSyncedAt: string | null = null;
let lastError: string | null = null;

export function getSyncStatus(): SyncStatus {
  return {
    online: isBrowserOnline(),
    pendingDrafts:
      getPendingDraftIds().length + getPendingDraftClears().length,
    pendingRecords: getPendingRecords().length,
    syncing,
    lastSyncedAt,
    lastError,
  };
}

export function emitSyncStatus(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(SYNC_STATUS_EVENT, { detail: getSyncStatus() }),
  );
}

export async function flushOfflineQueue(): Promise<void> {
  if (!isBrowserOnline() || syncing) return;

  syncing = true;
  lastError = null;
  emitSyncStatus();

  try {
    for (const visitId of getPendingDraftClears()) {
      try {
        await apiSend<void>(`/api/jobs/${visitId}/draft`, "DELETE");
        clearDraftPendingClear(visitId);
      } catch (error) {
        lastError =
          error instanceof Error ? error.message : "Draft clear failed";
        break;
      }
    }

    if (!lastError) {
      for (const visitId of getPendingDraftIds()) {
        const draft = readLocalDraft(visitId);
        if (!draft) {
          clearDraftPendingSync(visitId);
          continue;
        }
        try {
          await apiSend<{ ok: boolean }>(
            `/api/jobs/${visitId}/draft`,
            "PUT",
            draft,
          );
          clearDraftPendingSync(visitId);
        } catch (error) {
          lastError =
            error instanceof Error ? error.message : "Draft sync failed";
          break;
        }
      }
    }

    if (!lastError) {
      for (const record of getPendingRecords()) {
        try {
          await apiSend<VisitRecord>("/api/records", "POST", record);
          removePendingRecord(record.id);
        } catch (error) {
          lastError =
            error instanceof Error ? error.message : "Report sync failed";
          break;
        }
      }
    }

    if (!lastError) {
      lastSyncedAt = new Date().toISOString();
    }
  } finally {
    syncing = false;
    emitSyncStatus();
  }
}

export type UpsertRecordResult = {
  record: VisitRecord;
  synced: boolean;
};

export async function upsertRecordOfflineAware(
  record: VisitRecord,
): Promise<UpsertRecordResult> {
  if (isBrowserOnline()) {
    try {
      const saved = await apiSend<VisitRecord>("/api/records", "POST", record);
      removePendingRecord(record.id);
      emitSyncStatus();
      return { record: saved, synced: true };
    } catch {
      queueRecord(record);
      emitSyncStatus();
      return { record, synced: false };
    }
  }

  queueRecord(record);
  emitSyncStatus();
  return { record, synced: false };
}

export async function saveDraftOfflineAware(draft: VisitDraft): Promise<void> {
  writeLocalDraft(draft);
  markDraftPendingSync(draft.visitId);
  emitSyncStatus();

  if (isBrowserOnline()) {
    try {
      await apiSend<{ ok: boolean }>(
        `/api/jobs/${draft.visitId}/draft`,
        "PUT",
        draft,
      );
      clearDraftPendingSync(draft.visitId);
      emitSyncStatus();
    } catch {
      /* stays pending */
    }
  }
}

export async function clearDraftOfflineAware(visitId: string): Promise<void> {
  clearLocalDraft(visitId);
  clearDraftPendingSync(visitId);
  markDraftPendingClear(visitId);
  emitSyncStatus();

  if (isBrowserOnline()) {
    try {
      await apiSend<void>(`/api/jobs/${visitId}/draft`, "DELETE");
      clearDraftPendingClear(visitId);
      emitSyncStatus();
    } catch {
      /* stays pending */
    }
  }
}

export async function loadDraftOfflineAware(
  visitId: string,
): Promise<VisitDraft | null> {
  const local = readLocalDraft(visitId);

  if (!isBrowserOnline()) return local;

  try {
    const remote = await apiGet<VisitDraft | null>(
      `/api/jobs/${visitId}/draft`,
    );
    if (!local) return remote ?? null;
    if (!remote) return local;
    const merged = local.updatedAt >= remote.updatedAt ? local : remote;
    writeLocalDraft(merged);
    return merged;
  } catch {
    return local;
  }
}
