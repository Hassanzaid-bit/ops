"use client";

import { useEffect, useState } from "react";
import {
  flushOfflineQueue,
  getSyncStatus,
  SYNC_STATUS_EVENT,
  type SyncStatus,
} from "@/lib/offline/sync";
import { refreshFieldCache } from "@/lib/ops-store";

export function OfflineSyncProvider() {
  useEffect(() => {
    void (async () => {
      await refreshFieldCache();
      await flushOfflineQueue();
    })();

    function onOnline() {
      void (async () => {
        await refreshFieldCache();
        await flushOfflineQueue();
      })();
    }

    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  return null;
}

export function OfflineStatusBar() {
  const [status, setStatus] = useState<SyncStatus | null>(null);

  useEffect(() => {
    function refresh() {
      setStatus(getSyncStatus());
    }
    refresh();
    window.addEventListener(SYNC_STATUS_EVENT, refresh);
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    return () => {
      window.removeEventListener(SYNC_STATUS_EVENT, refresh);
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
    };
  }, []);

  if (!status) return null;

  const pending = status.pendingDrafts + status.pendingRecords;
  const showBar = !status.online || pending > 0 || status.syncing;

  if (!showBar) return null;

  let message = "Back online";
  if (!status.online) {
    message =
      pending > 0
        ? `Offline — ${pending} item${pending === 1 ? "" : "s"} waiting to sync`
        : "Offline — using cached jobs and drafts";
  } else if (status.syncing) {
    message = "Syncing saved field data…";
  } else if (pending > 0) {
    message = `${pending} item${pending === 1 ? "" : "s"} waiting to sync`;
  }

  return (
    <div
      className={[
        "border-b px-4 py-2 text-center text-sm font-medium",
        status.online
          ? "border-[var(--warn)]/30 bg-[var(--warn-soft)] text-[var(--warn)]"
          : "border-[var(--line)] bg-[var(--surface)] text-[var(--ink-muted)]",
      ].join(" ")}
      role="status"
    >
      {message}
      {status.online && pending > 0 && !status.syncing && (
        <button
          type="button"
          onClick={() => void flushOfflineQueue()}
          className="ml-2 font-semibold underline"
        >
          Sync now
        </button>
      )}
    </div>
  );
}
