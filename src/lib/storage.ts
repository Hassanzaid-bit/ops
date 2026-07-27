import type { VisitDraft } from "./types";

const PREFIX = "qzone-draft:";

function key(visitId: string) {
  return `${PREFIX}${visitId}`;
}

export function loadDraft(visitId: string): VisitDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key(visitId));
    if (!raw) return null;
    return JSON.parse(raw) as VisitDraft;
  } catch {
    return null;
  }
}

export function saveDraft(draft: VisitDraft): void {
  if (typeof window === "undefined") return;
  const next = { ...draft, updatedAt: new Date().toISOString() };
  localStorage.setItem(key(draft.visitId), JSON.stringify(next));
}

export function clearDraft(visitId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(key(visitId));
}

export function listDraftMeta(): { visitId: string; updatedAt: string; submittedAt?: string }[] {
  if (typeof window === "undefined") return [];
  const out: { visitId: string; updatedAt: string; submittedAt?: string }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k?.startsWith(PREFIX)) continue;
    try {
      const d = JSON.parse(localStorage.getItem(k)!) as VisitDraft;
      out.push({
        visitId: d.visitId,
        updatedAt: d.updatedAt,
        submittedAt: d.submittedAt,
      });
    } catch {
      /* skip */
    }
  }
  return out;
}
