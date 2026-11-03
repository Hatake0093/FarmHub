import { describe, expect, it } from "vitest";
import { normalizeBox, planMove } from "./selection";
import type { VoxelGrid } from "./isometric";

const palette = ["minecraft:air", "minecraft:stone", "minecraft:hopper"];

function grid(width: number, height: number, depth: number, placed: [number, number, number, number][]): VoxelGrid {
  const blocks = new Uint16Array(width * height * depth);
  for (const [x, y, z, p] of placed) blocks[(y * depth + z) * width + x] = p;
  return { width, height, depth, palette, blocks };
}

describe("selection", () => {
  it("normaliza la caja sea cual sea el orden de los puntos", () => {
    expect(normalizeBox({ x: 3, z: 1 }, { x: 1, z: 4 }, 2, 0)).toEqual({ x0: 1, x1: 3, z0: 1, z1: 4, y0: 0, y1: 2 });
  });

  it("mueve un bloque: el origen queda en aire y el destino recibe el bloque", () => {
    const g = grid(3, 1, 1, [[0, 0, 0, 1]]);
    const changes = planMove(g, normalizeBox({ x: 0, z: 0 }, { x: 0, z: 0 }, 0, 0), { dx: 1, dy: 0, dz: 0 }) ?? [];

    expect([...changes].sort((a, b) => a.x - b.x)).toEqual([
      { x: 0, y: 0, z: 0, block: null },
      { x: 1, y: 0, z: 0, block: "minecraft:stone" },
    ]);
  });

  it("mover un grupo que solapa consigo mismo no pierde bloques", () => {
    // Dos bloques en x=0 y x=1; se mueven una casilla a la derecha.
    const g = grid(3, 1, 1, [[0, 0, 0, 1], [1, 0, 0, 2]]);
    const changes = planMove(g, normalizeBox({ x: 0, z: 0 }, { x: 1, z: 0 }, 0, 0), { dx: 1, dy: 0, dz: 0 }) ?? [];
    const result = new Map<number, string | null>();
    result.set(0, "minecraft:air");
    for (const c of changes) if (c.x === 1 || c.x === 2) result.set(c.x, c.block);

    expect(result.get(2)).toBe("minecraft:hopper");
    expect(result.get(1)).toBe("minecraft:stone");
  });

  it("devuelve null si el destino sale de la estructura", () => {
    const g = grid(2, 1, 1, [[1, 0, 0, 1]]);

    expect(planMove(g, normalizeBox({ x: 1, z: 0 }, { x: 1, z: 0 }, 0, 0), { dx: 1, dy: 0, dz: 0 })).toBeNull();
  });
});
