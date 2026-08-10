import { newId, saveSite } from "./ops-store";
import { apiGet, apiSend } from "./api-fetch";

export type Client = {
  id: string;
  name: string;
  notes: string;
  createdAt: string;
};

export async function listClients(): Promise<Client[]> {
  return apiGet<Client[]>("/api/clients");
}

export async function getClient(id: string): Promise<Client | undefined> {
  try {
    return await apiGet<Client>(`/api/clients/${id}`);
  } catch {
    return undefined;
  }
}

export async function saveClient(client: Client): Promise<Client> {
  return apiSend<Client>(`/api/clients/${client.id}`, "PATCH", client);
}

export async function deleteClient(id: string): Promise<void> {
  await apiSend<void>(`/api/clients/${id}`, "DELETE");
}

export type CreateClientInput = {
  name: string;
  notes?: string;
  firstBranch?: string;
};

export async function createClient(input: CreateClientInput): Promise<Client> {
  return apiSend<Client>("/api/clients", "POST", input);
}

export { newId, saveSite };
