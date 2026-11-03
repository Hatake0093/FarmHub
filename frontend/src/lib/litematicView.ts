/** Bloques de aire: no se dibujan. Debe coincidir con LitematicStatistics.AirBlocks. */
const AIR = new Set(["minecraft:air", "minecraft:cave_air", "minecraft:void_air"]);

export function isAir(block: string): boolean {
  return AIR.has(block);
}

/** Color estable por nombre de bloque (el mismo bloque siempre tiene el mismo color). */
export function blockColor(block: string): string {
  let hash = 0;
  for (let i = 0; i < block.length; i++) {
    hash = (hash * 31 + block.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  return `hsl(${hue} 55% 55%)`;
}

/** Nombre legible: "minecraft:oak_slab" -> "oak slab". */
export function blockLabel(block: string): string {
  return block.replace(/^minecraft:/, "").replace(/_/g, " ");
}
