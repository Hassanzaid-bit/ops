import type { ScheduledVisit, Site } from "./types";
import {
  flatLabelsInclude,
  flattenChecklistLabels,
} from "./site-checklist";
import { apiGet, apiSend } from "./api-fetch";
import {
  cacheSite,
  cacheSites,
  cacheVisit,
  cacheVisitsForDate,
  getCachedSite,
  getCachedSites,
  getCachedVisit,
  getCachedVisitsForDate,
} from "./offline/field-cache";
import { isBrowserOnline } from "./offline/local-storage";

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Refresh local field cache when online (today's jobs + all sites). */
export async function refreshFieldCache(date = todayISO()): Promise<void> {
  if (!isBrowserOnline()) return;
  try {
    const [sites, visits] = await Promise.all([
      apiGet<Site[]>("/api/sites"),
      apiGet<ScheduledVisit[]>(`/api/jobs?date=${encodeURIComponent(date)}`),
    ]);
    cacheSites(sites);
    cacheVisitsForDate(date, visits);
  } catch {
    /* keep existing cache */
  }
}

export async function listSites(): Promise<Site[]> {
  if (isBrowserOnline()) {
    try {
      const sites = await apiGet<Site[]>("/api/sites");
      cacheSites(sites);
      return sites;
    } catch {
      return getCachedSites();
    }
  }
  return getCachedSites();
}

export async function getSite(siteId: string): Promise<Site | undefined> {
  if (isBrowserOnline()) {
    try {
      const site = await apiGet<Site>(`/api/sites/${siteId}`);
      cacheSite(site);
      return site;
    } catch {
      return getCachedSite(siteId);
    }
  }
  return getCachedSite(siteId);
}

export async function saveSite(site: Site): Promise<Site> {
  if (site.id && (await getSite(site.id))) {
    return apiSend<Site>(`/api/sites/${site.id}`, "PATCH", site);
  }
  return apiSend<Site>("/api/sites", "POST", site);
}

export async function deleteSite(siteId: string): Promise<void> {
  await apiSend<void>(`/api/sites/${siteId}`, "DELETE");
}

export async function listVisits(): Promise<ScheduledVisit[]> {
  return apiGet<ScheduledVisit[]>("/api/jobs");
}

export async function listVisitsForDate(date: string): Promise<ScheduledVisit[]> {
  if (isBrowserOnline()) {
    try {
      const visits = await apiGet<ScheduledVisit[]>(
        `/api/jobs?date=${encodeURIComponent(date)}`,
      );
      cacheVisitsForDate(date, visits);
      return visits;
    } catch {
      return getCachedVisitsForDate(date);
    }
  }
  return getCachedVisitsForDate(date);
}

export async function listTodayVisits(): Promise<ScheduledVisit[]> {
  return listVisitsForDate(todayISO());
}

export async function getVisit(visitId: string): Promise<ScheduledVisit | undefined> {
  if (isBrowserOnline()) {
    try {
      const visit = await apiGet<ScheduledVisit>(`/api/jobs/${visitId}`);
      cacheVisit(visit);
      return visit;
    } catch {
      return getCachedVisit(visitId);
    }
  }
  return getCachedVisit(visitId);
}

export async function saveVisit(visit: ScheduledVisit): Promise<ScheduledVisit> {
  try {
    await apiGet<ScheduledVisit>(`/api/jobs/${visit.id}`);
    return apiSend<ScheduledVisit>(`/api/jobs/${visit.id}`, "PATCH", visit);
  } catch {
    return apiSend<ScheduledVisit>("/api/jobs", "POST", visit);
  }
}

export async function deleteVisit(visitId: string): Promise<void> {
  await apiSend<void>(`/api/jobs/${visitId}`, "DELETE");
}

export async function getAvailableAreas(visit: ScheduledVisit): Promise<string[]> {
  const site = await getSite(visit.siteId);
  if (!site) return [];
  if (visit.visitType === "follow_up" && visit.followUpAreas?.length) {
    return visit.followUpAreas.filter((a) =>
      flatLabelsInclude(site.checklistAreas, a),
    );
  }
  return flattenChecklistLabels(site.checklistAreas);
}
