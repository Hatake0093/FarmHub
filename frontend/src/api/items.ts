import { apiRequest } from "./client";

export interface ItemEntry {
  id: string;
  englishName: string;
  spanishName: string | null;
  color: string | null;
}

export const itemsApi = {
  list: (q = "") => apiRequest<ItemEntry[]>(`/items${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  update: (shortName: string, spanishName: string | null, color: string | null) =>
    apiRequest<ItemEntry>(`/items/${shortName}`, {
      method: "PUT",
      body: JSON.stringify({ spanishName, color }),
    }),
  add: (name: string) => apiRequest<ItemEntry>("/items", { method: "POST", body: JSON.stringify({ name }) }),
};
