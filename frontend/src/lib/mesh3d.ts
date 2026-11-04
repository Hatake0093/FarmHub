import { isAir } from "./litematicView";
import { overrideColor, textureKey } from "./blockColors";
import { faceTextureFor, TEXTURE_FACES, type TextureFace } from "./blockFaces";
import { baseBlock, isTransparent, shapeBoxes, type Box } from "./blockShapes";
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
  /** Textura que pide la cara: arriba y abajo tienen las suyas; el resto usa la de lados. */
  face: TextureFace;
  n: [number, number, number];
  corners: [number, number, number][];
  uAxis: Axis;
  uInvert: boolean;
  vAxis: Axis;
  vInvert: boolean;
}

// La textura se ve derecha desde fuera de cada cara: v baja con la altura y u crece hacia la derecha
// de quien mira la cara.
const FACES: FaceDef[] = [
  { face: "side", axis: 0, sign: 1, n: [1, 0, 0], corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], uAxis: 2, uInvert: true, vAxis: 1, vInvert: true },
  { face: "side", axis: 0, sign: -1, n: [-1, 0, 0], corners: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]], uAxis: 2, uInvert: false, vAxis: 1, vInvert: true },
  { face: "top", axis: 1, sign: 1, n: [0, 1, 0], corners: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]], uAxis: 0, uInvert: false, vAxis: 2, vInvert: false },
  { face: "bottom", axis: 1, sign: -1, n: [0, -1, 0], corners: [[0, 0, 1], [0, 0, 0], [1, 0, 0], [1, 0, 1]], uAxis: 0, uInvert: false, vAxis: 2, vInvert: true },
  { face: "side", axis: 2, sign: 1, n: [0, 0, 1], corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], uAxis: 0, uInvert: false, vAxis: 1, vInvert: true },
  { face: "side", axis: 2, sign: -1, n: [0, 0, -1], corners: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], uAxis: 0, uInvert: true, vAxis: 1, vInvert: true },
];

const DIAG = Math.SQRT1_2;

/**
 * Las dos diagonales de una caja en cruz (plantas). Van de esquina a esquina de la caja y se ven por
 * los dos lados, porque la vista no descarta caras traseras. axis no se usa: no se ocultan nunca.
 */
const CROSS_FACES: FaceDef[] = [
  { face: "side", axis: 0, sign: 1, n: [DIAG, 0, -DIAG], corners: [[0, 0, 0], [1, 0, 1], [1, 1, 1], [0, 1, 0]], uAxis: 0, uInvert: false, vAxis: 1, vInvert: true },
  { face: "side", axis: 0, sign: 1, n: [DIAG, 0, DIAG], corners: [[0, 0, 1], [1, 0, 0], [1, 1, 0], [0, 1, 1]], uAxis: 0, uInvert: false, vAxis: 1, vInvert: true },
];

/** Una caja sin grosor en un eje (un plano) solo dibuja una de las dos caras de ese eje, y ninguna de lado. */
function skipFlatFace(box: Box, def: FaceDef): boolean {
  for (let a = 0; a < 3; a++) {
    if (box.lo[a] !== box.hi[a]) continue;
    if (a !== def.axis || def.sign < 0) return true;
  }
  return false;
}

/** ¿Puede la caja tapar la cara de un vecino? Las plantas, los planos y las piezas que dependen de la textura, no. */
function canCover(box: Box): boolean {
  return !box.cross && !box.when && box.lo.every((v, a) => v < box.hi[a]);
}

/** Clave de atlas de la textura de una cara, según las caras que tienen textura. */
function tileKeyFor(base: string, face: TextureFace, tiles: Map<string, TileRect>): TileRect | null {
  const chosen = faceTextureFor(face, (f) => tiles.has(textureKey(base, f)));
  return chosen ? tiles.get(textureKey(base, chosen)) ?? null : null;
}

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
 * Recorre las caras de una parte de la rejilla: la sólida (`solid`) o la de vidrio (`glass`).
 * Una cara del borde de la celda se omite cuando el vecino la cubre por completo. El vidrio no
 * cubre nada, así que no tapa lo que hay detrás; dos bloques de vidrio iguales no dibujan la cara
 * que tienen en común.
 */
function forEachFace(
  grid: VoxelGrid,
  part: "solid" | "glass",
  textured: boolean[],
  onFace: (block: number, x: number, y: number, z: number, box: Box, def: FaceDef) => void,
): void {
  const { width, height, depth, blocks, palette } = grid;
  const transparent = palette.map((block) => isTransparent(block));
  // Las cajas que solo se dibujan con textura (o solo sin ella) se eligen según tenga o no el bloque.
  const boxesOf = palette.map((block, i) =>
    isAir(block)
      ? []
      : shapeBoxes(block).filter((b) => !b.when || (b.when === "textured") === textured[i]),
  );
  const coverOf = boxesOf.map((boxes, i) => (transparent[i] ? [] : boxes.filter(canCover)));
  const indexAt = (x: number, y: number, z: number) => blocks[(y * depth + z) * width + x];

  for (let y = 0; y < height; y++) {
    for (let z = 0; z < depth; z++) {
      for (let x = 0; x < width; x++) {
        const block = indexAt(x, y, z);
        if (transparent[block] !== (part === "glass")) continue;
        for (const box of boxesOf[block]) {
          if (box.cross) {
            for (const def of CROSS_FACES) onFace(block, x, y, z, box, def);
            continue;
          }
          for (const def of FACES) {
            if (skipFlatFace(box, def)) continue;
            const a = def.axis;
            const onBoundary = def.sign > 0 ? box.hi[a] === 1 : box.lo[a] === 0;
            if (onBoundary) {
              const d = def.n;
              const nx = x + d[0];
              const ny = y + d[1];
              const nz = z + d[2];
              if (nx >= 0 && ny >= 0 && nz >= 0 && nx < width && ny < height && nz < depth) {
                const neighbour = indexAt(nx, ny, nz);
                if (transparent[block] && neighbour === block) continue;
                if (covers(coverOf[neighbour], box, def)) continue;
              }
            }
            onFace(block, x, y, z, box, def);
          }
        }
      }
    }
  }
}

/** Malla de una parte de la rejilla. Si `tiles` tiene el bloque (sin estado), la cara lleva su posición en el atlas. */
function buildPart(grid: VoxelGrid, tiles: Map<string, TileRect> | null, part: "solid" | "glass"): MeshData {
  const { width, height, depth, palette } = grid;

  const colors = palette.map((block) => blockRgb(block));
  // Por bloque, la textura de cada cara (o null si usa color). Las claves del atlas son "id#cara".
  const tileOf = palette.map((block) => {
    const base = baseBlock(block);
    const result: Record<TextureFace, TileRect | null> = { side: null, top: null, bottom: null };
    if (!tiles) return result;
    for (const f of TEXTURE_FACES) result[f] = tileKeyFor(base, f, tiles);
    return result;
  });
  const textured = tileOf.map((t) => t.side !== null || t.top !== null || t.bottom !== null);

  let faces = 0;
  forEachFace(grid, part, textured, () => {
    faces++;
  });

  const vertices = new Float32Array(faces * 4 * FLOATS_PER_VERTEX);
  const indices = new Uint32Array(faces * 6);
  let v = 0;
  let i = 0;
  let face = 0;

  // Los vértices se escriben directamente en el búfer, sin crear arrays temporales por vértice:
  // con cientos de miles de caras, esa asignación es lo que más tarda.
  forEachFace(grid, part, textured, (block, x, y, z, box, def) => {
    const [r, g, b] = colors[block];
    const tile = tileOf[block][box.face ?? def.face];
    const base = face * 4;
    const flag = tile ? 1 : 0;
    const { lo, hi } = box;
    const corners = def.corners;
    for (let c = 0; c < 4; c++) {
      const sel = corners[c];
      const lx = sel[0] ? hi[0] : lo[0];
      const ly = sel[1] ? hi[1] : lo[1];
      const lz = sel[2] ? hi[2] : lo[2];
      const uRaw = def.uAxis === 0 ? lx : def.uAxis === 1 ? ly : lz;
      const vRaw = def.vAxis === 0 ? lx : def.vAxis === 1 ? ly : lz;
      // Con fit, la textura cubre la caja entera; si no, usa la posición dentro de la celda.
      const uSpan = hi[def.uAxis] - lo[def.uAxis];
      const vSpan = hi[def.vAxis] - lo[def.vAxis];
      const uLocal = box.fit && uSpan > 0 ? (uRaw - lo[def.uAxis]) / uSpan : uRaw;
      const vLocal = box.fit && vSpan > 0 ? (vRaw - lo[def.vAxis]) / vSpan : vRaw;
      const fu = def.uInvert ? 1 - uLocal : uLocal;
      const fv = def.vInvert ? 1 - vLocal : vLocal;
      vertices[v] = x + lx;
      vertices[v + 1] = y + ly;
      vertices[v + 2] = z + lz;
      vertices[v + 3] = def.n[0];
      vertices[v + 4] = def.n[1];
      vertices[v + 5] = def.n[2];
      vertices[v + 6] = r;
      vertices[v + 7] = g;
      vertices[v + 8] = b;
      vertices[v + 9] = tile ? tile.u0 + (tile.u1 - tile.u0) * fu : 0;
      vertices[v + 10] = tile ? tile.v0 + (tile.v1 - tile.v0) * fv : 0;
      vertices[v + 11] = flag;
      v += FLOATS_PER_VERTEX;
    }
    indices[i] = base;
    indices[i + 1] = base + 1;
    indices[i + 2] = base + 2;
    indices[i + 3] = base;
    indices[i + 4] = base + 2;
    indices[i + 5] = base + 3;
    i += 6;
    face++;
  });

  const center: [number, number, number] = [width / 2, height / 2, depth / 2];
  const radius = Math.max(1, Math.hypot(width, height, depth) / 2);
  return { vertices, indices, faces, radius, center };
}

/** Malla de los bloques sólidos (sin vidrio). */
export function buildMesh(grid: VoxelGrid, tiles: Map<string, TileRect> | null): MeshData {
  return buildPart(grid, tiles, "solid");
}

/** Mallas separadas: los bloques sólidos y el vidrio, que se dibuja después con transparencia. */
export function buildMeshes(grid: VoxelGrid, tiles: Map<string, TileRect> | null): { solid: MeshData; glass: MeshData } {
  return { solid: buildPart(grid, tiles, "solid"), glass: buildPart(grid, tiles, "glass") };
}
