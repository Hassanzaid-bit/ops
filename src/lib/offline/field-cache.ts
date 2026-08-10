import type { ScheduledVisit, Site } from "@/lib/types";
import { readJson, writeJson } from "./local-storage";

const CACHE_KEY = "field-cache-v1";

type FieldCache = {
  sites: Site[];
  visitsByDate: Record<string, ScheduledVisit[]>;
  visitsById: Record<string, ScheduledVisit>;
  updatedAt: string | null;
};

function emptyCache(): FieldCache {
  return {
    sites: [],
    visitsByDate: {},
    visitsById: {},
    updatedAt: null,
  };
}

function readCache(): FieldCache {
  return readJson(CACHE_KEY, emptyCache());
}

function writeCache(cache: FieldCache): void {
  writeJson(CACHE_KEY, cache);
}

export function cacheSites(sites: Site[]): void {
  const cache = readCache();
  cache.sites = sites;
  cache.updatedAt = new Date().toISOString();
  writeCache(cache);
}

export function cacheSite(site: Site): void {
  const cache = readCache();
  const idx = cache.sites.findIndex((s) => s.id === site.id);
  if (idx >= 0) cache.sites[idx] = site;
  else cache.sites.push(site);
  cache.updatedAt = new Date().toISOString();
  writeCache(cache);
}

export function cacheVisitsForDate(
  date: string,
  visits: ScheduledVisit[],
): void {
  const cache = readCache();
  cache.visitsByDate[date] = visits;
  for (const visit of visits) {
    cache.visitsById[visit.id] = visit;
  }
  cache.updatedAt = new Date().toISOString();
  writeCache(cache);
}

export function cacheVisit(visit: ScheduledVisit): void {
  const cache = readCache();
  cache.visitsById[visit.id] = visit;
  const list = cache.visitsByDate[visit.date] ?? [];
  const idx = list.findIndex((v) => v.id === visit.id);
  if (idx >= 0) list[idx] = visit;
  else list.push(visit);
  cache.visitsByDate[visit.date] = list;
  cache.updatedAt = new Date().toISOString();
  writeCache(cache);
}

export function getCachedSites(): Site[] {
  return readCache().sites;
}

export function getCachedSite(siteId: string): Site | undefined {
  return readCache().sites.find((s) => s.id === siteId);
}

export function getCachedVisitsForDate(date: string): ScheduledVisit[] {
  return readCache().visitsByDate[date] ?? [];
}

export function getCachedVisit(visitId: string): ScheduledVisit | undefined {
  return readCache().visitsById[visitId];
}

export function getFieldCacheUpdatedAt(): string | null {
  return readCache().updatedAt;
}
