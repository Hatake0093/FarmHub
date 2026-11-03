import { describe, expect, it } from "vitest";
import { floodFillLayer, mirrorBox, rotateBoxQuarter } from "./design";
import type { VoxelGrid } from "./isometric";

const palette = ["minecraft:air", "minecraft:stone", "minecraft:hopper"];
function grid(width: number, height: number, depth: number, placed: [number, number, number, number][]): VoxelGrid {
  const blocks = new Uint16Array(width * height * depth);
  for (const [x, y, z, p] of placed) blocks[(y * depth + z) * width + x] = p;
  return { width, height, depth, palette, blocks };
}
const whole = (g: VoxelGrid) => ({ x0: 0, x1: g.width - 1, y0: 0, y1: g.height - 1, z0: 0, z1: g.depth - 1 });
const valueAt = (g: VoxelGrid, c: { x: number; y: number; z: number }, changes: { x: number; y: number; z: number; block: string | null }[]) => {
  const hit = changes.find((k) => k.x === c.x && k.y === c.y && k.z === c.z);
  if (hit) return hit.block ?? "minecraft:air";
  return palette[g.blocks[(c.y * g.depth + c.z) * g.width + c.x]];
};

describe("floodFillLayer", () => {
  it("rellena solo la región conectada del mismo bloque", () => {
    // 3 × 1 × 3: borde de piedra; el interior (1,1) es aire y se rellena, la piedra no.
    const g = grid(3, 1, 3, [[0, 0, 0, 1], [1, 0, 0, 1], [2, 0, 0, 1], [0, 0, 1, 1], [2, 0, 1, 1], [0, 0, 2, 1], [1, 0, 2, 1], [2, 0, 2, 1]]);
    const changes = floodFillLayer(g, 0, 1, 1, "minecraft:hopper");

    expect(changes).toEqual([{ x: 1, y: 0, z: 1, block: "minecraft:hopper" }]);
  });

  it("no hace nada si el bloque ya es el mismo", () => {
    const g = grid(2, 1, 2, [[0, 0, 0, 2]]);
    expect(floodFillLayer(g, 0, 0, 0, "minecraft:hopper")).toEqual([]);
  });

  it("no cruza diagonales: las celdas de aire que solo se tocan en diagonal no se rellenan", () => {
    // Tolva en (1,0) y (0,1): el aire de (0,0) y (1,1) solo se toca en diagonal.
    const g = grid(2, 1, 2, [[1, 0, 0, 2], [0, 0, 1, 2]]);
    const changes = floodFillLayer(g, 0, 0, 0, "minecraft:stone");
    expect(changes).toEqual([{ x: 0, y: 0, z: 0, block: "minecraft:stone" }]);
  });
});

describe("mirrorBox", () => {
  it("refleja en X dentro de la caja", () => {
    const g = grid(3, 1, 1, [[0, 0, 0, 1]]);
    const changes = mirrorBox(g, { x0: 0, x1: 2, y0: 0, y1: 0, z0: 0, z1: 0 }, "x");
    expect(valueAt(g, { x: 2, y: 0, z: 0 }, changes)).toBe("minecraft:stone");
    expect(valueAt(g, { x: 0, y: 0, z: 0 }, changes)).toBe("minecraft:air");
  });
});

describe("rotateBoxQuarter", () => {
  it("gira una caja cuadrada 90° en sentido horario", () => {
    // 2 × 1 × 2: piedra en (0,0) (arriba-izq. en la vista). Tras girar pasa a (1,0).
    const g = grid(2, 1, 2, [[0, 0, 0, 1]]);
    const changes = rotateBoxQuarter(g, { x0: 0, x1: 1, y0: 0, y1: 0, z0: 0, z1: 1 }) ?? [];
    expect(valueAt(g, { x: 1, y: 0, z: 0 }, changes)).toBe("minecraft:stone");
    expect(valueAt(g, { x: 0, y: 0, z: 0 }, changes)).toBe("minecraft:air");
  });

  it("cuatro giros devuelven la caja original", () => {
    const g = grid(2, 1, 2, [[0, 0, 0, 1], [1, 0, 1, 2]]);
    const box = { x0: 0, x1: 1, y0: 0, y1: 0, z0: 0, z1: 1 };
    let cur = g;
    let total = 0;
    for (let i = 0; i < 4; i++) {
      const ch = rotateBoxQuarter(cur, box) ?? [];
      total += ch.length;
      const next = new Uint16Array(cur.blocks);
      for (const c of ch) {
        const name = c.block ?? "minecraft:air";
        const p = cur.palette.indexOf(name);
        next[(c.y * cur.depth + c.z) * cur.width + c.x] = p;
      }
      cur = { ...cur, blocks: next };
    }
    expect(Array.from(cur.blocks)).toEqual(Array.from(g.blocks));
    expect(total).toBeGreaterThan(0);
  });

  it("no gira una caja que no es cuadrada", () => {
    const g = grid(3, 1, 2, []);
    expect(rotateBoxQuarter(g, whole(g))).toBeNull();
  });
});
