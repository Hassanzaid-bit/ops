import { listSites, newId, saveSite } from "./ops-store";

export type Client = {
  id: string;
  name: string;
  notes: string;
  createdAt: string;
};

const STORE_KEY = "qzone-clients-v1";
const SEEDED_KEY = "qzone-clients-seeded-v1";

function readRaw(): Client[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Client[];
  } catch {
    return [];
  }
}

function writeRaw(clients: Client[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORE_KEY, JSON.stringify(clients));
}

/** Ensure every site clientName has a matching Client row. */
function syncFromSites(clients: Client[]): Client[] {
  const byName = new Map(
    clients.map((c) => [c.name.trim().toLowerCase(), c] as const),
  );
  let changed = false;
  for (const site of listSites()) {
    const key = site.clientName.trim().toLowerCase();
    if (!key || byName.has(key)) continue;
    const created: Client = {
      id: newId("client"),
      name: site.clientName.trim(),
      notes: "",
      createdAt: new Date().toISOString(),
    };
    byName.set(key, created);
    changed = true;
  }
  if (!changed) return clients;
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function ensureSeeded(): Client[] {
  if (typeof window === "undefined") {
    return seedFromSitesServer();
  }
  let clients = readRaw();
  const versionOk = localStorage.getItem(SEEDED_KEY) === "1";
  if (!versionOk || clients.length === 0) {
    clients = syncFromSites(clients);
    writeRaw(clients);
    localStorage.setItem(SEEDED_KEY, "1");
    return clients;
  }
  const synced = syncFromSites(clients);
  if (synced !== clients) writeRaw(synced);
  return synced;
}

function seedFromSitesServer(): Client[] {
  const names = [...new Set(listSites().map((s) => s.clientName.trim()))].filter(
    Boolean,
  );
  return names
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({
      id: `client-seed-${name.toLowerCase().replace(/\s+/g, "-")}`,
      name,
      notes: "",
      createdAt: "2026-07-23T00:00:00.000Z",
    }));
}

export function listClients(): Client[] {
  return ensureSeeded().sort((a, b) => a.name.localeCompare(b.name));
}

export function getClient(id: string): Client | undefined {
  return listClients().find((c) => c.id === id);
}

export function saveClient(client: Client): void {
  const all = listClients();
  const idx = all.findIndex((c) => c.id === client.id);
  const name = client.name.trim();
  if (!name) throw new Error("Client name is required");

  const duplicate = all.find(
    (c) =>
      c.id !== client.id &&
      c.name.trim().toLowerCase() === name.toLowerCase(),
  );
  if (duplicate) throw new Error("A client with that name already exists");

  const prev = idx >= 0 ? all[idx] : null;
  const next: Client = {
    ...client,
    name,
    notes: client.notes.trim(),
  };

  if (idx >= 0) all[idx] = next;
  else all.push(next);
  writeRaw(all);

  // Keep site.clientName in sync when renamed
  if (prev && prev.name !== next.name) {
    for (const site of listSites()) {
      if (site.clientName === prev.name) {
        saveSite({ ...site, clientName: next.name });
      }
    }
  }
}

export function deleteClient(id: string): void {
  const client = getClient(id);
  if (!client) return;
  const branches = listSites().filter((s) => s.clientName === client.name);
  if (branches.length > 0) {
    throw new Error(
      "Remove or reassign this client’s branches in Jobs before deleting.",
    );
  }
  writeRaw(listClients().filter((c) => c.id !== id));
}

export type CreateClientInput = {
  name: string;
  notes?: string;
  /** Optional first branch — creates a site; checklist is set in Jobs */
  firstBranch?: string;
};

export function createClient(input: CreateClientInput): Client {
  const name = input.name.trim();
  if (!name) throw new Error("Client name is required");

  const client: Client = {
    id: newId("client"),
    name,
    notes: (input.notes ?? "").trim(),
    createdAt: new Date().toISOString(),
  };
  saveClient(client);

  const branch = input.firstBranch?.trim();
  if (branch) {
    saveSite({
      id: newId("site"),
      clientName: client.name,
      siteName: branch,
      areas: [],
    });
  }

  return client;
}
