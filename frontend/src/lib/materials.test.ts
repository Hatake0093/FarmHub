import { describe, expect, it } from "vitest";
import { countMaterials } from "./materials";
import type { VoxelGrid } from "./isometric";

describe("countMaterials", () => {
  it("cuenta los bloques no aéreos y deja fuera el aire", () => {
    const grid: VoxelGrid = {
      width: 2,
      height: 2,
      depth: 1,
      palette: ["minecraft:air", "minecraft:stone", "minecraft:dirt"],
      blocks: new Uint16Array([0, 1, 1, 2]),
    };
    expect(countMaterials(grid)).toEqual([
      { block: "minecraft:stone", count: 2, stacks: 1 },
      { block: "minecraft:dirt", count: 1, stacks: 1 },
    ]);
  });

  it("agrupa los estados de un mismo bloque bajo su nombre base", () => {
    const grid: VoxelGrid = {
      width: 3,
      height: 1,
      depth: 1,
      palette: ["minecraft:air", "minecraft:oak_slab[type=top]", "minecraft:oak_slab[type=bottom]"],
      blocks: new Uint16Array([1, 2, 0]),
    };
    expect(countMaterials(grid)).toEqual([{ block: "minecraft:oak_slab", count: 2, stacks: 1 }]);
  });

  it("calcula los stacks de 64 y ordena por cantidad", () => {
    const blocks = new Uint16Array(130).fill(1);
    blocks[0] = 2;
    const grid: VoxelGrid = { width: 130, height: 1, depth: 1, palette: ["minecraft:air", "minecraft:stone", "minecraft:dirt"], blocks };
    expect(countMaterials(grid)).toEqual([
      { block: "minecraft:stone", count: 129, stacks: 3 },
      { block: "minecraft:dirt", count: 1, stacks: 1 },
    ]);
  });
});
