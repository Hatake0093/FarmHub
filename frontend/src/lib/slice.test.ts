import { describe, expect, it } from "vitest";
import { sliceGrid, sliceRange } from "./slice";
import { gridFromVolume } from "./volume";

// Volumen 2 × 2 × 3 (ancho × alto × profundidad). Índice = (y*depth + z)*width + x.
const palette = ["minecraft:air", "minecraft:stone", "minecraft:hopper"];
const blocks = new Uint16Array(12);
blocks[(1 * 3 + 0) * 2 + 1] = 1; // y=1, z=0, x=1 -> piedra
blocks[(0 * 3 + 2) * 2 + 0] = 2; // y=0, z=2, x=0 -> tolva
const grid = { width: 2, height: 2, depth: 3, palette, blocks };

describe("slice", () => {
  it("el corte en Z tiene columnas X y filas Y, con Y máxima arriba", () => {
    const s = sliceGrid(grid, "z", 0);

    expect(s.cols).toBe(2);
    expect(s.rows).toBe(2);
    expect(s.cells[0 * 2 + 1]).toBe(1); // fila 0 = y=1, columna x=1
    expect(s.cells[1 * 2 + 0]).toBe(0); // y=0 en z=0 está vacío
  });

  it("el corte en X tiene columnas Z", () => {
    const s = sliceGrid(grid, "x", 0);

    expect(s.cols).toBe(3);
    expect(s.cells[1 * 3 + 2]).toBe(2); // y=0, z=2, x=0 -> tolva
  });

  it("el rango de cortes depende del eje", () => {
    expect(sliceRange(grid, "x")).toBe(2);
    expect(sliceRange(grid, "z")).toBe(3);
  });

  it("reconstruye el volumen desde la respuesta de la API", () => {
    const view = new Uint16Array(12);
    view[(1 * 3 + 0) * 2 + 1] = 1;
    const base64 = btoa(String.fromCharCode(...new Uint8Array(view.buffer)));

    const g = gridFromVolume({ width: 2, height: 2, depth: 3, palette, cellsBase64: base64 });

    expect(g.blocks[(1 * 3 + 0) * 2 + 1]).toBe(1);
  });
});
