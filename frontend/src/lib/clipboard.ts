import type { VoxelGrid } from "./isometric";
import type { Box } from "./selection";
import type { Change } from "./design";

const AIR = "minecraft:air";
/** Tamaño máximo del portapapeles, para que quepa en el almacenamiento del navegador. */
export const MAX_CLIP_CELLS = 200_000;

/** Trozo copiado: sus celdas son índices de SU paleta (la primera entrada es aire). */
export interface Clip {
  width: number;
  height: number;
  depth: number;
  palette: string[];
  cells: number[];
}

export function extractBox(grid: VoxelGrid, box: Box): Clip | null {
  const w = box.x1 - box.x0 + 1;
  const h = box.y1 - box.y0 + 1;
  const d = box.z1 - box.z0 + 1;
  if (w * h * d > MAX_CLIP_CELLS) return null;
  const palette = [AIR];
  const cells: number[] = [];
  for (let y = box.y0; y <= box.y1; y++) {
    for (let z = box.z0; z <= box.z1; z++) {
      for (let x = box.x0; x <= box.x1; x++) {
        const name = grid.palette[grid.blocks[(y * grid.depth + z) * grid.width + x]];
        let index = palette.indexOf(name);
        if (index < 0) {
          palette.push(name);
          index = palette.length - 1;
        }
        cells.push(index);
      }
    }
  }
  return { width: w, height: h, depth: d, palette, cells };
}

/** Cambios para pegar el trozo con su esquina (x, y, z) en `origin`. Null si no cabe. */
export function planPaste(grid: VoxelGrid, clip: Clip, origin: { x: number; y: number; z: number }, keepAir: boolean): Change[] | null {
  if (origin.x < 0 || origin.y < 0 || origin.z < 0) return null;
  if (origin.x + clip.width > grid.width || origin.y + clip.height > grid.height || origin.z + clip.depth > grid.depth) {
    return null;
  }
  const changes: Change[] = [];
  for (let y = 0; y < clip.height; y++) {
    for (let z = 0; z < clip.depth; z++) {
      for (let x = 0; x < clip.width; x++) {
        const name = clip.palette[clip.cells[(y * clip.depth + z) * clip.width + x]];
        if (keepAir && name === AIR) continue;
        const gx = origin.x + x;
        const gy = origin.y + y;
        const gz = origin.z + z;
        const current = grid.palette[grid.blocks[(gy * grid.depth + gz) * grid.width + gx]];
        if (current !== name) {
          changes.push({ x: gx, y: gy, z: gz, block: name === AIR ? null : name });
        }
      }
    }
  }
  return changes;
}

/** Texto para guardar el portapapeles en el navegador. */
export function encodeClip(clip: Clip): string {
  return JSON.stringify(clip);
}

/** Lee el portapapeles guardado. Devuelve null si no existe o no es válido. */
export function decodeClip(text: string | null): Clip | null {
  if (!text) return null;
  try {
    const clip = JSON.parse(text) as Clip;
    const valid =
      Number.isInteger(clip.width) && Number.isInteger(clip.height) && Number.isInteger(clip.depth) &&
      Array.isArray(clip.palette) && Array.isArray(clip.cells) &&
      clip.cells.length === clip.width * clip.height * clip.depth;
    return valid ? clip : null;
  } catch {
    return null;
  }
}
