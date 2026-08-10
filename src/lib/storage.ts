import type { VisitDraft } from "./types";
import { apiGet } from "./api-fetch";
import {
  listLocalDraftMeta,
  mergeDraftMeta,
} from "./offline/draft-local";
import { isBrowserOnline } from "./offline/local-storage";
import {
  clearDraftOfflineAware,
  loadDraftOfflineAware,
  saveDraftOfflineAware,
} from "./offline/sync";

export async function loadDraft(visitId: string): Promise<VisitDraft | null> {
  return loadDraftOfflineAware(visitId);
}

export async function saveDraft(draft: VisitDraft): Promise<void> {
  return saveDraftOfflineAware(draft);
}

export async function clearDraft(visitId: string): Promise<void> {
  return clearDraftOfflineAware(visitId);
}

export async function listDraftMeta(): Promise<
  { visitId: string; updatedAt: string; submittedAt?: string }[]
> {
  const local = listLocalDraftMeta();

  if (!isBrowserOnline()) return local;

  try {
    const remote = await apiGet<
      { visitId: string; updatedAt: string; submittedAt?: string }[]
    >("/api/jobs/drafts-meta");
    return mergeDraftMeta(local, remote);
  } catch {
    return local;
  }
}
