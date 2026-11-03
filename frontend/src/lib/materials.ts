import { isAir } from "./litematicView";
import { baseBlock } from "./blockShapes";
import type { VoxelGrid } from "./isometric";

export interface MaterialCount {
  /** Nombre base del bloque, sin estado: "minecraft:oak_slab[type=top]" cuenta como "minecraft:oak_slab". */
  block: string;
  count: number;
  /** Stacks de 64, como en Minecraft. */
  stacks: number;
}

/** Recuento de bloques no aéreos de la rejilla, agrupados por nombre base y ordenados de mayor a menor. */
export function countMaterials(grid: VoxelGrid): MaterialCount[] {
  const perPalette = new Array<number>(grid.palette.length).fill(0);
  for (let i = 0; i < grid.blocks.length; i++) {
    perPalette[grid.blocks[i]]++;
  }

  const byBase = new Map<string, number>();
  grid.palette.forEach((name, index) => {
    if (perPalette[index] === 0 || isAir(name)) return;
    const base = baseBlock(name);
    byBase.set(base, (byBase.get(base) ?? 0) + perPalette[index]);
  });

  return [...byBase]
    .map(([block, count]) => ({ block, count, stacks: Math.ceil(count / 64) }))
    .sort((a, b) => b.count - a.count || a.block.localeCompare(b.block));
}
