/**
 * Formas de bloque. Un identificador de paleta puede llevar estado, por ejemplo
 * "minecraft:oak_slab[type=top,waterlogged=false]". Aquí se separa el nombre base de las
 * propiedades y se calcula qué parte de la celda ocupa el bloque.
 */

/** Caja dentro de la celda unidad: lo y hi en 0..1, en orden x, y, z. */
export interface Box {
  lo: [number, number, number];
  hi: [number, number, number];
  /**
   * Si es true, la textura se estira sobre la caja entera en lugar de usar la posición dentro de la
   * celda. Sirve para piezas finas como las antorchas, que si no mostrarían solo una franja.
   */
  fit?: boolean;
}

const FULL: Box[] = [{ lo: [0, 0, 0], hi: [1, 1, 1] }];

/** Nombre sin estado: "minecraft:oak_slab[type=top]" -> "minecraft:oak_slab". */
export function baseBlock(block: string): string {
  const cut = block.indexOf("[");
  return cut === -1 ? block : block.slice(0, cut);
}

/** Propiedades del identificador: "minecraft:oak_slab[type=top,waterlogged=false]" -> { type: "top", ... }. */
export function blockProperties(block: string): Record<string, string> {
  const start = block.indexOf("[");
  if (start === -1 || !block.endsWith("]")) return {};
  const props: Record<string, string> = {};
  for (const pair of block.slice(start + 1, -1).split(",")) {
    const eq = pair.indexOf("=");
    if (eq > 0) props[pair.slice(0, eq)] = pair.slice(eq + 1);
  }
  return props;
}

/** Cajas que ocupa el bloque dentro de su celda. Un bloque sin forma especial ocupa la celda entera. */
export function shapeBoxes(block: string): Box[] {
  const base = baseBlock(block);
  if (base.endsWith("_slab")) {
    const type = blockProperties(block).type;
    if (type === "top") return [{ lo: [0, 0.5, 0], hi: [1, 1, 1] }];
    if (type === "double") return FULL;
    return [{ lo: [0, 0, 0], hi: [1, 0.5, 1] }];
  }
  const torch = torchBoxes(block);
  if (torch) return torch;
  if (base === "minecraft:glass_pane" || base.endsWith("_stained_glass_pane")) {
    return [{ lo: [0.4375, 0, 0.4375], hi: [0.5625, 1, 0.5625] }];
  }
  return FULL;
}

const TORCH_BASES = new Set([
  "minecraft:torch",
  "minecraft:redstone_torch",
  "minecraft:soul_torch",
]);
const WALL_TORCH_BASES = new Set([
  "minecraft:wall_torch",
  "minecraft:redstone_wall_torch",
  "minecraft:soul_wall_torch",
]);

/**
 * Antorcha de pie: un poste de 2/16 de ancho y 10/16 de alto, centrado en la celda.
 * Antorcha de pared: el mismo poste pegado a la pared indicada por facing (la pared está en el lado opuesto).
 */
function torchBoxes(block: string): Box[] | null {
  const base = baseBlock(block);
  if (TORCH_BASES.has(base)) {
    return [{ lo: [7 / 16, 0, 7 / 16], hi: [9 / 16, 10 / 16, 9 / 16], fit: true }];
  }
  if (WALL_TORCH_BASES.has(base)) {
    const facing = blockProperties(block).facing;
    // Se pega a la pared en el lado contrario al que indica facing; el poste se separa 3/16 de ella.
    const center: Record<string, [number, number]> = {
      east: [0.25, 0.5],
      west: [0.75, 0.5],
      north: [0.5, 0.75],
      south: [0.5, 0.25],
    };
    const at = center[facing ?? ""] ?? [0.5, 0.5];
    return [{ lo: [at[0] - 1 / 16, 3 / 16, at[1] - 1 / 16], hi: [at[0] + 1 / 16, 13 / 16, at[1] + 1 / 16], fit: true }];
  }
  return null;
}

/** Vidrio y cristal de colores: se dibuja con transparencia. */
export function isTransparent(block: string): boolean {
  const base = baseBlock(block);
  return base === "minecraft:glass" || base.endsWith("_stained_glass") || base === "minecraft:glass_pane" || base.endsWith("_stained_glass_pane");
}

/** Indica si las cajas de un bloque cubren toda la celda. */
export function isFullCell(block: string): boolean {
  const boxes = shapeBoxes(block);
  return boxes.length === 1 && boxes[0].lo.every((v) => v === 0) && boxes[0].hi.every((v) => v === 1);
}
