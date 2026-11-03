import { getTextureByKey } from "./textures";
import type { TileRect } from "./mesh3d";

/** Tamaño de cada textura dentro del atlas. Las texturas de cualquier tamaño se reducen a este lado. */
export const TILE = 64;

export function atlasLayout(count: number, tile = TILE): { cols: number; rows: number; width: number; height: number } {
  const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.max(1, Math.ceil(count / cols));
  return { cols, rows, width: cols * tile, height: rows * tile };
}

/**
 * Junta las texturas cargadas en un solo canvas (el atlas). Cada clave es "id#cara". Devuelve null si
 * no hay ninguna textura cargada.
 */
export function buildAtlas(keys: string[]): { canvas: HTMLCanvasElement; tiles: Map<string, TileRect> } | null {
  const loaded = keys.filter((key) => getTextureByKey(key) !== undefined);
  if (loaded.length === 0) return null;

  const layout = atlasLayout(loaded.length);
  const canvas = document.createElement("canvas");
  canvas.width = layout.width;
  canvas.height = layout.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;

  const tiles = new Map<string, TileRect>();
  loaded.forEach((key, index) => {
    const col = index % layout.cols;
    const row = Math.floor(index / layout.cols);
    const img = getTextureByKey(key);
    if (img) ctx.drawImage(img, col * TILE, row * TILE, TILE, TILE);
    tiles.set(key, {
      u0: (col * TILE) / layout.width,
      v0: (row * TILE) / layout.height,
      u1: ((col + 1) * TILE) / layout.width,
      v1: ((row + 1) * TILE) / layout.height,
    });
  });
  return { canvas, tiles };
}
