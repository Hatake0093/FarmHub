import type { VoxelGrid } from "./isometric";

export type SliceAxis = "x" | "z";

/** Sección 2D: filas de arriba (Y máxima) hacia abajo, columnas de izquierda a derecha. */
export interface SliceGrid {
  cols: number;
  rows: number;
  palette: string[];
  cells: Uint16Array;
}

/** Número de cortes posibles en el eje elegido. */
export function sliceRange(grid: VoxelGrid, axis: SliceAxis): number {
  return axis === "x" ? grid.width : grid.depth;
}

/**
 * Corte lateral. Eje "z": plano fijo en z (columnas X, filas Y).
 * Eje "x": plano fijo en x (columnas Z, filas Y).
 */
export function sliceGrid(grid: VoxelGrid, axis: SliceAxis, index: number): SliceGrid {
  const { width, height, depth, blocks, palette } = grid;
  const cols = axis === "z" ? width : depth;
  const rows = height;
  const cells = new Uint16Array(cols * rows);
  for (let y = 0; y < height; y++) {
    const row = height - 1 - y;
    for (let c = 0; c < cols; c++) {
      const x = axis === "z" ? c : index;
      const z = axis === "z" ? index : c;
      cells[row * cols + c] = blocks[(y * depth + z) * width + x];
    }
  }
  return { cols, rows, palette, cells };
}
