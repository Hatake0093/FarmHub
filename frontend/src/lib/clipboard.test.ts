import { describe, expect, it } from "vitest";
import { decodeClip, encodeClip, extractBox, planPaste } from "./clipboard";
import type { VoxelGrid } from "./isometric";

const palette = ["minecraft:air", "minecraft:stone", "minecraft:hopper"];
function grid(width: number, height: number, depth: number, placed: [number, number, number, number][]): VoxelGrid {
  const blocks = new Uint16Array(width * height * depth);
  for (const [x, y, z, p] of placed) blocks[(y * depth + z) * width + x] = p;
  return { width, height, depth, palette, blocks };
}
const nameAt = (g: VoxelGrid, x: number, y: number, z: number) => g.palette[g.blocks[(y * g.depth + z) * g.width + x]];

describe("clipboard", () => {
  it("copia una caja y la pega en otra rejilla en la posición indicada", () => {
    const source = grid(3, 1, 3, [[0, 0, 0, 1], [1, 0, 0, 2]]);
    const clip = extractBox(source, { x0: 0, x1: 1, y0: 0, y1: 0, z0: 0, z1: 0 });
    expect(clip).not.toBeNull();

    const target = grid(4, 1, 4, []);
    const changes = planPaste(target, clip!, { x: 2, y: 0, z: 1 }, false) ?? [];
    for (const c of changes) {
      target.blocks[(c.y * target.depth + c.z) * target.width + c.x] = target.palette.indexOf(c.block ?? "minecraft:air");
    }

    expect(nameAt(target, 2, 0, 1)).toBe("minecraft:stone");
    expect(nameAt(target, 3, 0, 1)).toBe("minecraft:hopper");
  });

  it("con keepAir no borra lo que hay donde el trozo tiene aire", () => {
    const source = grid(2, 1, 1, [[0, 0, 0, 1]]);
    const clip = extractBox(source, { x0: 0, x1: 1, y0: 0, y1: 0, z0: 0, z1: 0 })!;
    const target = grid(2, 1, 1, [[1, 0, 0, 2]]);

    const changes = planPaste(target, clip, { x: 0, y: 0, z: 0 }, true) ?? [];

    expect(changes).toEqual([{ x: 0, y: 0, z: 0, block: "minecraft:stone" }]);
  });

  it("rechaza pegar fuera de la estructura", () => {
    const source = grid(2, 1, 1, [[0, 0, 0, 1]]);
    const clip = extractBox(source, { x0: 0, x1: 1, y0: 0, y1: 0, z0: 0, z1: 0 })!;

    expect(planPaste(grid(2, 1, 1, []), clip, { x: 1, y: 0, z: 0 }, false)).toBeNull();
  });

  it("guarda y lee el portapapeles, y descarta datos dañados", () => {
    const source = grid(2, 1, 1, [[0, 0, 0, 1]]);
    const clip = extractBox(source, { x0: 0, x1: 1, y0: 0, y1: 0, z0: 0, z1: 0 })!;

    expect(decodeClip(encodeClip(clip))).toEqual(clip);
    expect(decodeClip("no es json")).toBeNull();
    expect(decodeClip(null)).toBeNull();
  });
});
