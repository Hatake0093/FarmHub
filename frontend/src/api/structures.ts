import { apiRequest } from "./client";

export interface StructureListItem {
  id: number;
  name: string;
  width: number;
  height: number;
  depth: number;
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
  layer: (id: number, y: number) => apiRequest<StructureLayer>(`/structures/${id}/layer?y=${y}`),
  saveBlocks: (id: number, changes: { x: number; y: number; z: number; block: string | null }[]) =>
    apiRequest<StructureDetail>(`/structures/${id}/blocks`, {
      method: "PATCH",
      body: JSON.stringify({ changes }),
    }),
};
