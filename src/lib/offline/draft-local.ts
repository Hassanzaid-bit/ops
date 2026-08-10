import type { VisitDraft } from "@/lib/types";
import { readJson, removeKey, writeJson } from "./local-storage";

const DRAFT_PREFIX = "draft:";
const PENDING_DRAFTS_KEY = "pending-drafts-v1";
const PENDING_DRAFT_CLEARS_KEY = "pending-draft-clears-v1";

function draftKey(visitId: string): string {
  return DRAFT_PREFIX + visitId;
}

export function readLocalDraft(visitId: string): VisitDraft | null {
  return readJson<VisitDraft | null>(draftKey(visitId), null);
}

export function writeLocalDraft(draft: VisitDraft): void {
  writeJson(draftKey(draft.visitId), draft);
}

export function clearLocalDraft(visitId: string): void {
  removeKey(draftKey(visitId));
}

export function listLocalDraftMeta(): {
  visitId: string;
  updatedAt: string;
  submittedAt?: string;
}[] {
  if (typeof window === "undefined") return [];
  const out: {
    visitId: string;
    updatedAt: string;
    submittedAt?: string;
  }[] = [];
  const prefix = "qzone-offline:" + DRAFT_PREFIX;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(prefix)) continue;
    try {
      const draft = JSON.parse(
        localStorage.getItem(key)!,
      ) as VisitDraft;
      out.push({
        visitId: draft.visitId,
        updatedAt: draft.updatedAt,
        submittedAt: draft.submittedAt,
      });
    } catch {
      /* skip */
    }
  }
  return out;
}

export function getPendingDraftIds(): string[] {
  return readJson<string[]>(PENDING_DRAFTS_KEY, []);
}

export function markDraftPendingSync(visitId: string): void {
  const ids = new Set(getPendingDraftIds());
  ids.add(visitId);
  writeJson(PENDING_DRAFTS_KEY, [...ids]);
}

export function clearDraftPendingSync(visitId: string): void {
  writeJson(
    PENDING_DRAFTS_KEY,
    getPendingDraftIds().filter((id) => id !== visitId),
  );
}

export function getPendingDraftClears(): string[] {
  return readJson<string[]>(PENDING_DRAFT_CLEARS_KEY, []);
}

export function markDraftPendingClear(visitId: string): void {
  const ids = new Set(getPendingDraftClears());
  ids.add(visitId);
  writeJson(PENDING_DRAFT_CLEARS_KEY, [...ids]);
}

export function clearDraftPendingClear(visitId: string): void {
  writeJson(
    PENDING_DRAFT_CLEARS_KEY,
    getPendingDraftClears().filter((id) => id !== visitId),
  );
}

export function mergeDraft(
  local: VisitDraft | null,
  remote: VisitDraft | null,
): VisitDraft | null {
  if (!local) return remote;
  if (!remote) return local;
  return local.updatedAt >= remote.updatedAt ? local : remote;
}

export function mergeDraftMeta(
  local: { visitId: string; updatedAt: string; submittedAt?: string }[],
  remote: { visitId: string; updatedAt: string; submittedAt?: string }[],
) {
  const byId = new Map(remote.map((m) => [m.visitId, m] as const));
  for (const item of local) {
    const existing = byId.get(item.visitId);
    if (!existing || item.updatedAt > existing.updatedAt) {
      byId.set(item.visitId, item);
    }
  }
  return [...byId.values()];
}
