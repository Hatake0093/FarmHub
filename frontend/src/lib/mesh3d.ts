import { isAir } from "./litematicView";
import { overrideColor } from "./blockColors";
import { baseBlock, shapeBoxes, type Box } from "./blockShapes";
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

type Axis = 0 | 1 | 2;

/**
 * Una cara de una caja. Las cuatro esquinas se dan como 0 o 1 por eje: 0 es el mínimo de la caja
 * y 1 el máximo. El uv sale de la posición dentro de la celda, así que una losa muestra la mitad
 * correspondiente de la textura en lugar de estirarla.
 */
interface FaceDef {
  axis: Axis;
  sign: 1 | -1;
  n: [number, number, number];
  corners: [number, number, number][];
  uAxis: Axis;
  uInvert: boolean;
  vAxis: Axis;
  vInvert: boolean;
}

const FACES: FaceDef[] = [
  { axis: 0, sign: 1, n: [1, 0, 0], corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], uAxis: 2, uInvert: false, vAxis: 1, vInvert: true },
  { axis: 0, sign: -1, n: [-1, 0, 0], corners: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]], uAxis: 2, uInvert: true, vAxis: 1, vInvert: true },
  { axis: 1, sign: 1, n: [0, 1, 0], corners: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]], uAxis: 0, uInvert: false, vAxis: 2, vInvert: true },
  { axis: 1, sign: -1, n: [0, -1, 0], corners: [[0, 0, 1], [0, 0, 0], [1, 0, 0], [1, 0, 1]], uAxis: 0, uInvert: false, vAxis: 2, vInvert: false },
  { axis: 2, sign: 1, n: [0, 0, 1], corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], uAxis: 1, uInvert: false, vAxis: 0, vInvert: true },
  { axis: 2, sign: -1, n: [0, 0, -1], corners: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], uAxis: 1, uInvert: false, vAxis: 0, vInvert: false },
];

/** Color de un bloque como valores 0..1: el elegido, o uno estable derivado del nombre. Ignora el estado. */
export function blockRgb(block: string): [number, number, number] {
  const base = baseBlock(block);
  const chosen = overrideColor(base);
  if (chosen) {
    const n = parseInt(chosen.slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  let hash = 0;
  for (let i = 0; i < base.length; i++) hash = (hash * 31 + base.charCodeAt(i)) >>> 0;
  return hslToRgb((hash % 360) / 360, 0.5, 0.55);
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const k = (n: number) => (n + h * 12) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}

/**
 * ¿Cubre el bloque vecino la cara de la caja? Solo si tiene una caja que toque el lado compartido
 * y que contenga el rectángulo de la cara.
 */
function covers(neighbour: Box[], box: Box, def: FaceDef): boolean {
  const a = def.axis;
  const b = (a + 1) % 3;
  const c = (a + 2) % 3;
  for (const o of neighbour) {
    const touches = def.sign > 0 ? o.lo[a] === 0 : o.hi[a] === 1;
    if (!touches) continue;
    if (o.lo[b] <= box.lo[b] && o.hi[b] >= box.hi[b] && o.lo[c] <= box.lo[c] && o.hi[c] >= box.hi[c]) return true;
  }
  return false;
}

/**
 * Recorre las caras visibles de la rejilla. Cada bloque aporta sus cajas; una cara del borde de la
 * celda se omite cuando el vecino la cubre por completo. Las caras interiores siempre se dibujan.
 */
function forEachFace(grid: VoxelGrid, onFace: (block: number, x: number, y: number, z: number, box: Box, def: FaceDef) => void): void {
  const { width, height, depth, blocks, palette } = grid;
  const boxesOf = palette.map((block) => (isAir(block) ? [] : shapeBoxes(block)));
  const indexAt = (x: number, y: number, z: number) => blocks[(y * depth + z) * width + x];

  for (let y = 0; y < height; y++) {
    for (let z = 0; z < depth; z++) {
      for (let x = 0; x < width; x++) {
        const block = indexAt(x, y, z);
        const boxes = boxesOf[block];
        for (const box of boxes) {
          for (const def of FACES) {
            const a = def.axis;
            const onBoundary = def.sign > 0 ? box.hi[a] === 1 : box.lo[a] === 0;
            if (onBoundary) {
              const d = def.n;
              const nx = x + d[0];
              const ny = y + d[1];
              const nz = z + d[2];
              if (nx >= 0 && ny >= 0 && nz >= 0 && nx < width && ny < height && nz < depth) {
                if (covers(boxesOf[indexAt(nx, ny, nz)], box, def)) continue;
              }
            }
            onFace(block, x, y, z, box, def);
          }
        }
      }
    }
  }
}

/**
 * Malla de las caras visibles de la rejilla. Si `tiles` tiene el bloque (sin estado), la cara lleva
 * su posición en el atlas.
 */
export function buildMesh(grid: VoxelGrid, tiles: Map<string, TileRect> | null): MeshData {
  const { width, height, depth, palette } = grid;

  let faces = 0;
  forEachFace(grid, () => {
    faces++;
  });

  const colors = palette.map((block) => blockRgb(block));
  const tileOf = palette.map((block) => tiles?.get(baseBlock(block)) ?? null);

  const vertices = new Float32Array(faces * 4 * FLOATS_PER_VERTEX);
  const indices = new Uint32Array(faces * 6);
  let v = 0;
  let i = 0;
  let face = 0;

  forEachFace(grid, (block, x, y, z, box, def) => {
    const [r, g, b] = colors[block];
    const tile = tileOf[block];
    const base = face * 4;
    for (const sel of def.corners) {
      const local: [number, number, number] = [
        sel[0] ? box.hi[0] : box.lo[0],
        sel[1] ? box.hi[1] : box.lo[1],
        sel[2] ? box.hi[2] : box.lo[2],
      ];
      const fu = def.uInvert ? 1 - local[def.uAxis] : local[def.uAxis];
      const fv = def.vInvert ? 1 - local[def.vAxis] : local[def.vAxis];
      const u = tile ? tile.u0 + (tile.u1 - tile.u0) * fu : 0;
      const w = tile ? tile.v0 + (tile.v1 - tile.v0) * fv : 0;
      vertices.set(
        [x + local[0], y + local[1], z + local[2], def.n[0], def.n[1], def.n[2], r, g, b, u, w, tile ? 1 : 0],
        v,
      );
      v += FLOATS_PER_VERTEX;
    }
    indices.set([base, base + 1, base + 2, base, base + 2, base + 3], i);
    i += 6;
    face++;
  });

  const center: [number, number, number] = [width / 2, height / 2, depth / 2];
  const radius = Math.max(1, Math.hypot(width, height, depth) / 2);
  return { vertices, indices, faces, radius, center };
}
