const PREFIX = "qzone-offline:";

export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function isBrowserOnline(): boolean {
  return isBrowser() && navigator.onLine;
}

export function readJson<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  if (!isBrowser()) return;
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
}

export function removeKey(key: string): void {
  if (!isBrowser()) return;
  localStorage.removeItem(PREFIX + key);
}
