import type { ScheduledVisit, Site } from "./types";
import { SITES as SEED_SITES, TODAY_VISITS as SEED_VISITS } from "./mock-data";

const SITES_KEY = "qzone-sites-v1";
const VISITS_KEY = "qzone-visits-v1";
/** Bump when seed sites/visits change so browsers pick up live branding */
const SEEDED_KEY = "qzone-ops-seeded-v4";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function ensureSeeded() {
  if (typeof window === "undefined") return;
  const versionOk = localStorage.getItem(SEEDED_KEY) === "1";
  if (!versionOk) {
    writeJson(SITES_KEY, SEED_SITES);
    writeJson(
      VISITS_KEY,
      SEED_VISITS.map((v) => ({ ...v, date: todayISO() })),
    );
    localStorage.setItem(SEEDED_KEY, "1");
    localStorage.removeItem("qzone-ops-seeded-v1");
    localStorage.removeItem("qzone-ops-seeded-v2");
    localStorage.removeItem("qzone-ops-seeded-v3");
    return;
  }
  const sites = readJson<Site[]>(SITES_KEY, []);
  const visits = readJson<ScheduledVisit[]>(VISITS_KEY, []);
  if (sites.length === 0) writeJson(SITES_KEY, SEED_SITES);
  if (visits.length === 0) {
    writeJson(
      VISITS_KEY,
      SEED_VISITS.map((v) => ({ ...v, date: todayISO() })),
    );
  }
}

export function listSites(): Site[] {
  ensureSeeded();
  if (typeof window === "undefined") return SEED_SITES;
  return readJson<Site[]>(SITES_KEY, SEED_SITES);
}

export function getSite(siteId: string): Site | undefined {
  return listSites().find((s) => s.id === siteId);
}

export function saveSite(site: Site): void {
  ensureSeeded();
  const all = listSites();
  const idx = all.findIndex((s) => s.id === site.id);
  if (idx >= 0) all[idx] = site;
  else all.push(site);
  writeJson(SITES_KEY, all);
}

export function deleteSite(siteId: string): void {
  ensureSeeded();
  writeJson(
    SITES_KEY,
    listSites().filter((s) => s.id !== siteId),
  );
  // Drop visits for deleted site
  writeJson(
    VISITS_KEY,
    listVisits().filter((v) => v.siteId !== siteId),
  );
}

export function listVisits(): ScheduledVisit[] {
  ensureSeeded();
  if (typeof window === "undefined") return SEED_VISITS;
  return readJson<ScheduledVisit[]>(VISITS_KEY, SEED_VISITS);
}

export function listVisitsForDate(date: string): ScheduledVisit[] {
  return listVisits()
    .filter((v) => v.date === date)
    .sort((a, b) => (a.timeWindow ?? "").localeCompare(b.timeWindow ?? ""));
}

export function listTodayVisits(): ScheduledVisit[] {
  return listVisitsForDate(todayISO());
}

export function getVisit(visitId: string): ScheduledVisit | undefined {
  return listVisits().find((v) => v.id === visitId);
}

export function saveVisit(visit: ScheduledVisit): void {
  ensureSeeded();
  const all = listVisits();
  const idx = all.findIndex((v) => v.id === visit.id);
  if (idx >= 0) all[idx] = visit;
  else all.push(visit);
  writeJson(VISITS_KEY, all);
}

export function deleteVisit(visitId: string): void {
  ensureSeeded();
  writeJson(
    VISITS_KEY,
    listVisits().filter((v) => v.id !== visitId),
  );
}

export function getAvailableAreas(visit: ScheduledVisit): string[] {
  const site = getSite(visit.siteId);
  if (!site) return [];
  if (visit.visitType === "follow_up" && visit.followUpAreas?.length) {
    return visit.followUpAreas.filter((a) => site.areas.includes(a));
  }
  return site.areas;
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export { todayISO };
