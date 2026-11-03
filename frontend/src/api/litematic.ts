import { apiRequest } from "./client";
import type { VolumeDto } from "../lib/volume";

export interface LitematicRegion {
  name: string;
  positionX: number;
  positionY: number;
  positionZ: number;
  width: number;
  height: number;
  depth: number;
  sizeX: number;
  sizeY: number;
  sizeZ: number;
}

export interface LitematicBlockCount {
  block: string;
  count: number;
  stacks: number;
}

export interface LitematicSummary {
  name: string;
  author: string | null;
  description: string | null;
  regions: LitematicRegion[];
  blockCounts: LitematicBlockCount[];
  totalBlocks: number;
}

export interface LitematicLayer {
  region: string;
  y: number;
  width: number;
  depth: number;
  palette: string[];
  cells: number[];
}

export const litematicApi = {
  volume: (fileId: number, region: string) =>
    apiRequest<VolumeDto>(`/design-files/${fileId}/structure/volume?${new URLSearchParams({ region })}`),
  summary: (fileId: number) => apiRequest<LitematicSummary>(`/design-files/${fileId}/structure`),
  layer: (fileId: number, region: string, y: number) =>
    apiRequest<LitematicLayer>(
      `/design-files/${fileId}/structure/layer?${new URLSearchParams({ region, y: String(y) })}`,
    ),
};
