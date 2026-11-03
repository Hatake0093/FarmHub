import type { VoxelGrid } from "./isometric";
import type { Change } from "./design";

export type ShapeKind = "line" | "rect" | "box";

export interface Cell {
  x: number;
  z: number;
}

/** Celdas de una línea entre dos puntos de la capa (algoritmo de Bresenham, en X y Z). */
export function lineCells(a: Cell, b: Cell): Cell[] {
  const cells: Cell[] = [];
  let x = a.x;
  let z = a.z;
  const dx = Math.abs(b.x - a.x);
  const dz = -Math.abs(b.z - a.z);
  const sx = a.x < b.x ? 1 : -1;
  const sz = a.z < b.z ? 1 : -1;
  let err = dx + dz;
  for (;;) {
    cells.push({ x, z });
    if (x === b.x && z === b.z) break;
    const e2 = 2 * err;
    if (e2 >= dz) {
      err += dz;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      z += sz;
    }
  }
  return cells;
}

/** Celdas de un rectángulo entre dos esquinas. Hueco: solo el borde. Relleno: todo. */
export function rectCells(a: Cell, b: Cell, filled: boolean): Cell[] {
  const x0 = Math.min(a.x, b.x);
  const x1 = Math.max(a.x, b.x);
  const z0 = Math.min(a.z, b.z);
  const z1 = Math.max(a.z, b.z);
  const cells: Cell[] = [];
  for (let z = z0; z <= z1; z++) {
    for (let x = x0; x <= x1; x++) {
      if (filled || x === x0 || x === x1 || z === z0 || z === z1) cells.push({ x, z });
    }
  }
  return cells;
}

/** Cambios para dibujar una forma en la capa y, con bloque null = aire. Solo celdas que cambian. */
export function shapeChanges(grid: VoxelGrid, kind: ShapeKind, y: number, a: Cell, b: Cell, block: string | null): Change[] {
  const cells = kind === "line" ? lineCells(a, b) : rectCells(a, b, kind === "box");
  const target = block ?? "minecraft:air";
  const changes: Change[] = [];
  for (const c of cells) {
    const current = grid.palette[grid.blocks[(y * grid.depth + c.z) * grid.width + c.x]];
    if (current !== target) changes.push({ x: c.x, y, z: c.z, block: block });
  }
  return changes;
}
