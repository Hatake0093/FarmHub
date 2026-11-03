import { apiRequest } from "./client";

export interface BlockEntry {
  id: string;
  englishName: string;
  spanishName: string | null;
  color: string | null;
  hasTexture: boolean;
}

export const blocksApi = {
  uploadTexture: (shortName: string, file: File) => {
    const body = new FormData();
    body.append("file", file);
    return apiRequest<BlockEntry>(`/blocks/${shortName}/texture`, { method: "PUT", body });
  },
  add: (name: string) => apiRequest<BlockEntry>("/blocks", { method: "POST", body: JSON.stringify({ name }) }),
  removeTexture: (shortName: string) => apiRequest<void>(`/blocks/${shortName}/texture`, { method: "DELETE" }),
  list: (q = "", missingSpanish = false) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (missingSpanish) params.set("missingSpanish", "true");
    const text = params.toString();
    return apiRequest<BlockEntry[]>(`/blocks${text ? `?${text}` : ""}`);
  },
  setSpanish: (shortName: string, spanishName: string | null, color: string | null) =>
    apiRequest<BlockEntry>(`/blocks/${shortName}`, {
      method: "PUT",
      body: JSON.stringify({ spanishName, color }),
    }),
};
