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

/** Desplazamientos de las cuatro esquinas de cada cara (12 números por cara), calculados una sola vez. */
const FACE_CORNERS: Float32Array[] = FACES.map((f) => Float32Array.from(f.corners(0, 0, 0).flat()));

/**
 * Malla de las caras visibles de la rejilla. Una cara solo se dibuja si el bloque vecino en esa
 * dirección es aire. Si `tiles` tiene el bloque, la cara lleva su posición en el atlas.
 *
 * Es la parte más cara de abrir la vista 3D en estructuras de ~1M de celdas, así que evita asignar
 * memoria por cara: lo que depende del tipo de bloque (si es sólido, su color, su textura) se calcula
 * una vez por entrada de la paleta y los vértices se escriben directamente en el búfer.
 */
export function buildMesh(grid: VoxelGrid, tiles: Map<string, TileRect> | null): MeshData {
  const { width, height, depth, blocks, palette } = grid;
  const layerSize = width * depth;

  const isSolid = new Uint8Array(palette.length);
  const rgbs: [number, number, number][] = [];
  const tileOf: (TileRect | null)[] = [];
  palette.forEach((block, index) => {
    isSolid[index] = isAir(block) ? 0 : 1;
    rgbs[index] = blockRgb(block);
    tileOf[index] = tiles?.get(block) ?? null;
  });

  const solid = (x: number, y: number, z: number) => {
    if (x < 0 || y < 0 || z < 0 || x >= width || y >= height || z >= depth) return false;
    return isSolid[blocks[y * layerSize + z * width + x]] === 1;
  };

  let faces = 0;
  for (let y = 0; y < height; y++) {
    for (let z = 0; z < depth; z++) {
      for (let x = 0; x < width; x++) {
        if (isSolid[blocks[y * layerSize + z * width + x]] === 0) continue;
        for (let f = 0; f < 6; f++) {
          const n = NEIGHBOURS[f];
          if (!solid(x + n[0], y + n[1], z + n[2])) faces++;
        }
      }
    }
  }

  const vertices = new Float32Array(faces * 4 * FLOATS_PER_VERTEX);
  const indices = new Uint32Array(faces * 6);
  // Esquinas de la cara en coordenadas de textura (u, v), en el orden de FACE_CORNERS.
  const UV = [0, 1, 0, 0, 1, 0, 1, 1];
  let v = 0;
  let i = 0;
  let face = 0;

  for (let y = 0; y < height; y++) {
    for (let z = 0; z < depth; z++) {
      for (let x = 0; x < width; x++) {
        const paletteIndex = blocks[y * layerSize + z * width + x];
        if (isSolid[paletteIndex] === 0) continue;
        const [r, g, b] = rgbs[paletteIndex];
        const tile = tileOf[paletteIndex];
        const flag = tile ? 1 : 0;
        for (let f = 0; f < 6; f++) {
          const n = NEIGHBOURS[f];
          if (solid(x + n[0], y + n[1], z + n[2])) continue;
          const corners = FACE_CORNERS[f];
          for (let c = 0; c < 4; c++) {
            vertices[v] = x + corners[c * 3];
            vertices[v + 1] = y + corners[c * 3 + 1];
            vertices[v + 2] = z + corners[c * 3 + 2];
            vertices[v + 3] = n[0];
            vertices[v + 4] = n[1];
            vertices[v + 5] = n[2];
            vertices[v + 6] = r;
            vertices[v + 7] = g;
            vertices[v + 8] = b;
            vertices[v + 9] = tile ? tile.u0 + (tile.u1 - tile.u0) * UV[c * 2] : 0;
            vertices[v + 10] = tile ? tile.v0 + (tile.v1 - tile.v0) * UV[c * 2 + 1] : 0;
            vertices[v + 11] = flag;
            v += FLOATS_PER_VERTEX;
          }
          const base = face * 4;
          indices[i] = base;
          indices[i + 1] = base + 1;
          indices[i + 2] = base + 2;
          indices[i + 3] = base;
          indices[i + 4] = base + 2;
          indices[i + 5] = base + 3;
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
