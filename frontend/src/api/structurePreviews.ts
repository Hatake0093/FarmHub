import { apiRequest } from "./client";
import type { LitematicSummary } from "./litematic";
import type { VolumeDto } from "../lib/volume";

/** Vista previa de un archivo suelto: no se guarda nada en la base de datos. */
export interface StructurePreview {
  summary: LitematicSummary;
  volumes: { region: string; volume: VolumeDto }[];
}

export const structurePreviewApi = {
  preview: (file: File) => {
    const body = new FormData();
    body.append("file", file);
    return apiRequest<StructurePreview>("/structure-previews", { method: "POST", body });
  },
};
