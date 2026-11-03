import { describe, expect, it } from "vitest";
import { buildMesh } from "./mesh3d";
import type { VoxelGrid } from "./isometric";

const palette = ["minecraft:air", "minecraft:stone"];
function grid(width: number, height: number, depth: number, solid: [number, number, number][]): VoxelGrid {
  const blocks = new Uint16Array(width * height * depth);
  for (const [x, y, z] of solid) blocks[(y * depth + z) * width + x] = 1;
  return { width, height, depth, palette, blocks };
}

describe("buildMesh", () => {
  it("un cubo aislado tiene 6 caras", () => {
    const mesh = buildMesh(grid(1, 1, 1, [[0, 0, 0]]), null);
    expect(mesh.faces).toBe(6);
    expect(mesh.indices.length).toBe(36);
  });

  it("dos cubos pegados no dibujan la cara que tienen en común", () => {
    const mesh = buildMesh(grid(2, 1, 1, [[0, 0, 0], [1, 0, 0]]), null);
    expect(mesh.faces).toBe(10);
  });

  it("el aire no genera caras", () => {
    const mesh = buildMesh(grid(3, 3, 3, []), null);
    expect(mesh.faces).toBe(0);
  });

  it("guarda el centro y el radio para encuadrar la vista", () => {
    const mesh = buildMesh(grid(2, 2, 2, [[0, 0, 0]]), null);
    expect(mesh.center).toEqual([1, 1, 1]);
    expect(mesh.radius).toBeCloseTo(Math.hypot(2, 2, 2) / 2);
  });
});
