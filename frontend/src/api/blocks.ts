import { apiRequest } from "./client";
import type { TextureFace } from "../lib/blockFaces";

export interface BlockEntry {
  id: string;
  englishName: string;
  spanishName: string | null;
  color: string | null;
  hasTexture: boolean;
  /** Caras con textura propia: "side", "top", "bottom". */
  textureFaces: TextureFace[];
}

export const blocksApi = {
  uploadTexture: (shortName: string, file: File, face: TextureFace = "side") => {
    const body = new FormData();
    body.append("file", file);
    return apiRequest<BlockEntry>(`/blocks/${shortName}/texture/${face}`, { method: "PUT", body });
  },
  add: (name: string) => apiRequest<BlockEntry>("/blocks", { method: "POST", body: JSON.stringify({ name }) }),
  removeTexture: (shortName: string, face: TextureFace = "side") =>
    apiRequest<void>(`/blocks/${shortName}/texture/${face}`, { method: "DELETE" }),
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
