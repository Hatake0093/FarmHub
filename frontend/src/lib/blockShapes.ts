/**
 * Formas de bloque. Un identificador de paleta puede llevar estado, por ejemplo
 * "minecraft:oak_slab[type=top,waterlogged=false]". Aquí se separa el nombre base de las
 * propiedades y se calcula qué parte de la celda ocupa el bloque.
 */

/** Caja dentro de la celda unidad: lo y hi en 0..1, en orden x, y, z. */
export interface Box {
  lo: [number, number, number];
  hi: [number, number, number];
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
  return FULL;
}

/** Indica si las cajas de un bloque cubren toda la celda. */
export function isFullCell(block: string): boolean {
  const boxes = shapeBoxes(block);
  return boxes.length === 1 && boxes[0].lo.every((v) => v === 0) && boxes[0].hi.every((v) => v === 1);
}
