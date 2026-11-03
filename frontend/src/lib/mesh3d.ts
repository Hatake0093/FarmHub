import { isAir } from "./litematicView";
import { overrideColor } from "./blockColors";
import type { VoxelGrid } from "./isometric";

/** Rectángulo de un bloque dentro del atlas, en coordenadas 0..1 (v crece hacia abajo). */
export interface TileRect {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
}

/**
 * Vértice: posición (3), normal (3), color (3), uv (2), textura (1). Son 12 floats por vértice.
 * La malla usa 4 vértices y 6 índices por cara.
 */
export const FLOATS_PER_VERTEX = 12;

export interface MeshData {
  vertices: Float32Array;
  indices: Uint32Array;
  faces: number;
  radius: number;
  center: [number, number, number];
}

/** Caras: normal y las cuatro esquinas en orden. Las dos caras de cada cubo forman dos triángulos. */
const FACES: { n: [number, number, number]; corners: (x: number, y: number, z: number) => [number, number, number][] }[] = [
  { n: [1, 0, 0], corners: (x, y, z) => [[x + 1, y, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1], [x + 1, y, z + 1]] },
  { n: [-1, 0, 0], corners: (x, y, z) => [[x, y, z + 1], [x, y + 1, z + 1], [x, y + 1, z], [x, y, z]] },
  { n: [0, 1, 0], corners: (x, y, z) => [[x, y + 1, z], [x, y + 1, z + 1], [x + 1, y + 1, z + 1], [x + 1, y + 1, z]] },
  { n: [0, -1, 0], corners: (x, y, z) => [[x, y, z + 1], [x, y, z], [x + 1, y, z], [x + 1, y, z + 1]] },
  { n: [0, 0, 1], corners: (x, y, z) => [[x, y, z + 1], [x + 1, y, z + 1], [x + 1, y + 1, z + 1], [x, y + 1, z + 1]] },
  { n: [0, 0, -1], corners: (x, y, z) => [[x + 1, y, z], [x, y, z], [x, y + 1, z], [x + 1, y + 1, z]] },
];

/** Neighbour offsets, en el mismo orden que FACES. */
const NEIGHBOURS: [number, number, number][] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

/** Color de un bloque como valores 0..1: el elegido, o uno estable derivado del nombre. */
export function blockRgb(block: string): [number, number, number] {
  const chosen = overrideColor(block);
  if (chosen) {
    const n = parseInt(chosen.slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  let hash = 0;
  for (let i = 0; i < block.length; i++) hash = (hash * 31 + block.charCodeAt(i)) >>> 0;
  return hslToRgb((hash % 360) / 360, 0.5, 0.55);
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const k = (n: number) => (n + h * 12) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}

/**
 * Malla de las caras visibles de la rejilla. Una cara solo se dibuja si el bloque vecino en esa
 * dirección es aire. Si `tiles` tiene el bloque, la cara lleva su posición en el atlas.
 */
export function buildMesh(grid: VoxelGrid, tiles: Map<string, TileRect> | null): MeshData {
  const { width, height, depth, blocks, palette } = grid;
  const solid = (x: number, y: number, z: number) => {
    if (x < 0 || y < 0 || z < 0 || x >= width || y >= height || z >= depth) return false;
    return !isAir(palette[blocks[(y * depth + z) * width + x]]);
  };

  let faces = 0;
  for (let y = 0; y < height; y++) {
    for (let z = 0; z < depth; z++) {
      for (let x = 0; x < width; x++) {
        if (!solid(x, y, z)) continue;
        for (const [dx, dy, dz] of NEIGHBOURS) if (!solid(x + dx, y + dy, z + dz)) faces++;
      }
    }
  }

  const vertices = new Float32Array(faces * 4 * FLOATS_PER_VERTEX);
  const indices = new Uint32Array(faces * 6);
  const uvCorners: [number, number][] = [[0, 1], [0, 0], [1, 0], [1, 1]];
  let v = 0;
  let i = 0;
  let face = 0;

  for (let y = 0; y < height; y++) {
    for (let z = 0; z < depth; z++) {
      for (let x = 0; x < width; x++) {
        if (!solid(x, y, z)) continue;
        const block = palette[blocks[(y * depth + z) * width + x]];
        const [r, g, b] = blockRgb(block);
        const tile = tiles?.get(block) ?? null;
        for (let f = 0; f < 6; f++) {
          const [dx, dy, dz] = NEIGHBOURS[f];
          if (solid(x + dx, y + dy, z + dz)) continue;
          const def = FACES[f];
          const corners = def.corners(x, y, z);
          for (let c = 0; c < 4; c++) {
            const [px, py, pz] = corners[c];
            const [cu, cv] = uvCorners[c];
            const u = tile ? tile.u0 + (tile.u1 - tile.u0) * cu : 0;
            const w = tile ? tile.v0 + (tile.v1 - tile.v0) * cv : 0;
            vertices.set([px, py, pz, def.n[0], def.n[1], def.n[2], r, g, b, u, w, tile ? 1 : 0], v);
            v += FLOATS_PER_VERTEX;
          }
          const base = face * 4;
          indices.set([base, base + 1, base + 2, base, base + 2, base + 3], i);
          i += 6;
          face++;
        }
      }
    }
  }

  const center: [number, number, number] = [width / 2, height / 2, depth / 2];
  const radius = Math.max(1, Math.hypot(width, height, depth) / 2);
  return { vertices, indices, faces, radius, center };
}
