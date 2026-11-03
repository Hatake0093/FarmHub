import { apiRequest } from "./client";
import type { VolumeDto } from "../lib/volume";

export interface StructureListItem {
  id: number;
  name: string;
  description: string | null;
  width: number;
  height: number;
  depth: number;
  baseX: number;
  baseY: number;
  baseZ: number;
  blockCount: number;
  updatedAtUtc: string;
}

export interface StructureDetail {
  id: number;
  name: string;
  description: string | null;
  width: number;
  height: number;
  depth: number;
  baseX: number;
  baseY: number;
  baseZ: number;
  palette: string[];
  blockCount: number;
  updatedAtUtc: string;
}

export interface StructureLayer {
  y: number;
  width: number;
  depth: number;
  palette: string[];
  cells: number[];
}

export interface StructureCreateInput {
  name: string;
  description: string | null;
  width: number;
  height: number;
  depth: number;
  baseX: number;
  baseY: number;
  baseZ: number;
}

export interface StructureMetaInput {
  name: string;
  description: string | null;
  baseX: number;
  baseY: number;
  baseZ: number;
}

export const structuresApi = {
  list: () => apiRequest<StructureListItem[]>("/structures"),
  get: (id: number) => apiRequest<StructureDetail>(`/structures/${id}`),
  create: (input: StructureCreateInput) =>
    apiRequest<StructureDetail>("/structures", { method: "POST", body: JSON.stringify(input) }),
  updateMeta: (id: number, input: StructureMetaInput) =>
    apiRequest<StructureDetail>(`/structures/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  remove: (id: number) => apiRequest<void>(`/structures/${id}`, { method: "DELETE" }),
  importFile: (file: File) => {
    const body = new FormData();
    body.append("file", file);
    return apiRequest<StructureDetail>("/structures/import", { method: "POST", body });
  },
  extend: (id: number, amounts: { left: number; right: number; down: number; up: number; back: number; front: number }) =>
    apiRequest<StructureDetail>(`/structures/${id}/extend`, { method: "POST", body: JSON.stringify(amounts) }),
  resize: (id: number, width: number, height: number, depth: number, confirm: boolean) =>
    apiRequest<StructureDetail>(`/structures/${id}/size`, {
      method: "PUT",
      body: JSON.stringify({ width, height, depth, confirm }),
    }),
  layer: (id: number, y: number) => apiRequest<StructureLayer>(`/structures/${id}/layer?y=${y}`),
  volume: (id: number) => apiRequest<VolumeDto>(`/structures/${id}/volume`),
  saveBlocks: (id: number, changes: { x: number; y: number; z: number; block: string | null }[]) =>
    apiRequest<StructureDetail>(`/structures/${id}/blocks`, {
      method: "PATCH",
      body: JSON.stringify({ changes }),
    }),
};
