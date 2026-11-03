import { apiRequest } from "./client";

export interface BlockEntry {
  id: string;
  englishName: string;
  spanishName: string | null;
}

export const blocksApi = {
  list: (q = "", missingSpanish = false) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (missingSpanish) params.set("missingSpanish", "true");
    const text = params.toString();
    return apiRequest<BlockEntry[]>(`/blocks${text ? `?${text}` : ""}`);
  },
  setSpanish: (shortName: string, spanishName: string | null) =>
    apiRequest<BlockEntry>(`/blocks/${shortName}`, {
      method: "PUT",
      body: JSON.stringify({ spanishName }),
    }),
};
