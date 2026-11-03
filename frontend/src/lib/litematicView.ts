import { overrideColor } from "./blockColors";
import { baseBlock } from "./blockShapes";
/** Bloques de aire: no se dibujan. Debe coincidir con LitematicStatistics.AirBlocks. */
const AIR = new Set(["minecraft:air", "minecraft:cave_air", "minecraft:void_air"]);

export function isAir(block: string): boolean {
  return AIR.has(baseBlock(block));
}

/** Color del bloque: el elegido por el usuario o, si no hay, uno estable derivado del nombre base (sin estado). */
export function blockColor(block: string): string {
  const base = baseBlock(block);
  const chosen = overrideColor(base);
  if (chosen) return chosen;
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    hash = (hash * 31 + base.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  return `hsl(${hue} 55% 55%)`;
}

/** Nombre legible: "minecraft:oak_slab[type=top]" -> "oak slab". */
export function blockLabel(block: string): string {
  return baseBlock(block).replace(/^minecraft:/, "").replace(/_/g, " ");
}
