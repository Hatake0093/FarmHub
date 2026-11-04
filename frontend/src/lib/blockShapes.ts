import type { TextureFace } from "./blockFaces";

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
  /**
   * Si es true, la caja no es un cubo: se dibujan sus dos diagonales verticales, como en las plantas
   * de Minecraft (caña de azúcar, flores). Las partes transparentes de la textura no se pintan.
   */
  cross?: boolean;
  /** Textura que usan todas las caras de la caja, en lugar de la que toca a cada cara. */
  face?: TextureFace;
  /**
   * Cuándo se dibuja la caja: solo con textura (planos recortados, que sin ella serían cuadrados
   * macizos) o solo sin textura (la versión de color que los sustituye). Por defecto, siempre.
   */
  when?: "textured" | "untextured";
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
  const other = otherBoxes(block);
  if (other) return other;
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

const FLAT = 1 / 16;

/** Caja de un plano de texto: lo, hi en 0..1. */
function box(lo: [number, number, number], hi: [number, number, number], fit = false): Box {
  return fit ? { lo, hi, fit } : { lo, hi };
}

/** Lado del que está la pared para bloques pegados a una pared, según facing (la pared está al lado contrario). */
function wallSide(facing: string | undefined): { axis: 0 | 2; low: boolean } {
  switch (facing) {
    case "east": return { axis: 0, low: true };
    case "west": return { axis: 0, low: false };
    case "north": return { axis: 2, low: false };
    default: return { axis: 2, low: true };
  }
}

/** Formas de bloques finos y con estado: alfombras, placas, cables, vallas, escaleras, trampillas y escaleras de mano. */
function otherBoxes(block: string): Box[] | null {
  const base = baseBlock(block);
  const props = blockProperties(block);

  if (base.endsWith("_carpet") || base === "minecraft:redstone_wire") {
    return [box([0, 0, 0], [1, FLAT, 1])];
  }
  if (base.endsWith("_pressure_plate")) {
    return [box([FLAT, 0, FLAT], [1 - FLAT, FLAT, 1 - FLAT])];
  }
  if (base.endsWith("_fence_gate")) {
    return fenceGateBoxes(props);
  }
  if (base === "minecraft:sugar_cane") {
    return sugarCaneBoxes();
  }
  if (base === "minecraft:anvil" || base === "minecraft:chipped_anvil" || base === "minecraft:damaged_anvil") {
    return anvilBoxes(props.facing);
  }
  if (base === "minecraft:brewing_stand") {
    return brewingStandBoxes();
  }
  if (base.endsWith("_fence") && !base.endsWith("_fence_gate")) {
    // Poste central y un brazo por cada lado conectado.
    const boxes: Box[] = [box([6 / 16, 0, 6 / 16], [10 / 16, 1, 10 / 16], true)];
    const arm = (flag: string, lo: [number, number, number], hi: [number, number, number]) => {
      if (props[flag] === "true") boxes.push(box(lo, hi, true));
    };
    arm("north", [7 / 16, 6 / 16, 0], [9 / 16, 15 / 16, 0.5]);
    arm("south", [7 / 16, 6 / 16, 0.5], [9 / 16, 15 / 16, 1]);
    arm("west", [0, 6 / 16, 7 / 16], [0.5, 15 / 16, 9 / 16]);
    arm("east", [0.5, 6 / 16, 7 / 16], [1, 15 / 16, 9 / 16]);
    return boxes;
  }
  if (base === "minecraft:ladder") {
    // Dos largueros a los lados y cuatro peldaños, pegados a la pared. Así se reconoce la escalera
    // desde cualquier ángulo, aunque la vista la aplaste.
    const side = wallSide(props.facing);
    const t = 2 / 16;
    const depth: [number, number] = side.low ? [0, t] : [1 - t, 1];
    // Eje de la pared (z o x) y el eje ancho, que es el otro.
    const wallAxis: 0 | 2 = side.axis;
    const widthAxis: 0 | 2 = wallAxis === 0 ? 2 : 0;
    const make = (width: [number, number], y: [number, number]): Box => {
      const lo: [number, number, number] = [0, y[0], 0];
      const hi: [number, number, number] = [1, y[1], 1];
      lo[widthAxis] = width[0];
      hi[widthAxis] = width[1];
      lo[wallAxis] = depth[0];
      hi[wallAxis] = depth[1];
      return box(lo, hi, true);
    };
    const boxes: Box[] = [
      make([0, t], [0, 1]),
      make([1 - t, 1], [0, 1]),
    ];
    for (const y0 of [2 / 16, 6 / 16, 10 / 16, 14 / 16]) {
      boxes.push(make([t, 1 - t], [y0, y0 + t]));
    }
    return boxes;
  }
  if (base.endsWith("_trapdoor")) {
    const open = props.open === "true";
    if (!open) {
      return props.half === "top"
        ? [box([0, 13 / 16, 0], [1, 1, 1])]
        : [box([0, 0, 0], [1, 3 / 16, 1])];
    }
    // Abierta: la hoja queda vertical contra el borde del lado opuesto a facing.
    const side = wallSide(props.facing);
    const t = 3 / 16;
    if (side.axis === 2) {
      const z: [number, number] = side.low ? [0, t] : [1 - t, 1];
      return [box([0, 0, z[0]], [1, 1, z[1]], true)];
    }
    const x: [number, number] = side.low ? [0, t] : [1 - t, 1];
    return [box([x[0], 0, 0], [x[1], 1, 1], true)];
  }
  if (base.endsWith("_stairs")) {
    return stairBoxes(props.facing, props.half === "top", props.shape ?? "straight");
  }
  return null;
}

/** Caja en píxeles (0..16), como en los modelos de Minecraft. */
function px(from: [number, number, number], to: [number, number, number], extra: Partial<Box> = {}): Box {
  return {
    lo: [from[0] / 16, from[1] / 16, from[2] / 16],
    hi: [to[0] / 16, to[1] / 16, to[2] / 16],
    ...extra,
  };
}

/** Giros de 90° (horarios vistos desde arriba) que aplican los modelos según facing; el modelo base mira al sur. */
const TURNS: Record<string, number> = { south: 0, west: 1, north: 2, east: 3 };

/** Gira una caja alrededor del centro de la celda en pasos de 90°: cada giro lleva el sur al oeste. */
function rotateY(b: Box, turns: number): Box {
  for (let i = 0; i < ((turns % 4) + 4) % 4; i++) {
    // (x, z) -> (1 - z, x)
    const { lo, hi } = b;
    b = { ...b, lo: [1 - hi[2], lo[1], lo[0]], hi: [1 - lo[2], hi[1], hi[0]] };
  }
  return b;
}

/**
 * Puerta de valla, según el modelo de Minecraft. Cerrada: dos postes en los extremos y la hoja de dos
 * travesaños con dos barrotes en el centro. Abierta: las dos mitades giran hacia el lado de facing.
 * Pegada a un muro (in_wall) baja 3/16.
 */
function fenceGateBoxes(props: Record<string, string>): Box[] {
  const boxes: Box[] = [
    px([0, 5, 7], [2, 16, 9]),
    px([14, 5, 7], [16, 16, 9]),
  ];
  if (props.open === "true") {
    boxes.push(
      px([0, 6, 13], [2, 15, 15]),
      px([14, 6, 13], [16, 15, 15]),
      px([0, 6, 9], [2, 9, 13]),
      px([0, 12, 9], [2, 15, 13]),
      px([14, 6, 9], [16, 9, 13]),
      px([14, 12, 9], [16, 15, 13]),
    );
  } else {
    boxes.push(
      px([6, 6, 7], [8, 15, 9]),
      px([8, 6, 7], [10, 15, 9]),
      px([2, 6, 7], [6, 9, 9]),
      px([2, 12, 7], [6, 15, 9]),
      px([10, 6, 7], [14, 9, 9]),
      px([10, 12, 7], [14, 15, 9]),
    );
  }
  const drop = props.in_wall === "true" ? 3 / 16 : 0;
  const turns = TURNS[props.facing ?? "south"] ?? 0;
  return boxes.map((b) => {
    const r = rotateY(b, turns);
    return drop ? { ...r, lo: [r.lo[0], r.lo[1] - drop, r.lo[2]], hi: [r.hi[0], r.hi[1] - drop, r.hi[2]] } : r;
  });
}

/**
 * Caña de azúcar: con textura, dos planos en diagonal que la muestran como en el juego. Sin textura,
 * cuatro tallos finos, para que no se vea como un bloque macizo.
 */
function sugarCaneBoxes(): Box[] {
  return [
    { lo: [0, 0, 0], hi: [1, 1, 1], fit: true, cross: true, when: "textured" },
    px([2, 0, 2], [4, 16, 4], { when: "untextured" }),
    px([12, 0, 3], [14, 16, 5], { when: "untextured" }),
    px([3, 0, 11], [5, 16, 13], { when: "untextured" }),
    px([11, 0, 12], [13, 16, 14], { when: "untextured" }),
  ];
}

/**
 * Yunque, según el modelo de Minecraft: base, escalón, cuello y la pieza de arriba, que es la larga.
 * Con facing norte o sur la pieza larga va a lo largo de z; con este u oeste, a lo largo de x.
 */
function anvilBoxes(facing: string | undefined): Box[] {
  const turns = TURNS[facing ?? "south"] ?? 0;
  return [
    px([2, 0, 2], [14, 4, 14]),
    px([4, 4, 3], [12, 5, 13]),
    px([6, 5, 4], [10, 10, 12]),
    px([3, 10, 0], [13, 16, 16]),
  ].map((b) => rotateY(b, turns));
}

/**
 * Soporte para pociones: la vara central y las tres bases, que usan la textura de abajo (en Minecraft,
 * brewing_stand_base). Con textura se añade un plano sin grosor con el dibujo de los brazos y los soportes.
 */
function brewingStandBoxes(): Box[] {
  return [
    px([7, 0, 7], [9, 14, 9]),
    px([9, 0, 5], [15, 2, 11], { face: "bottom" }),
    px([2, 0, 1], [8, 2, 7], { face: "bottom" }),
    px([2, 0, 9], [8, 2, 15], { face: "bottom" }),
    px([0, 0, 8], [16, 16, 8], { fit: true, when: "textured" }),
  ];
}

/**
 * Escalera aproximada. La mitad (abajo, o arriba si half=top) es completa y el escalón sube hacia el
 * lado de facing. shape cambia el escalón: en las esquinas (inner/outer) se queda con un cuarto de celda
 * o se añade un cuarto en la parte de atrás. Las esquinas se aproximan, no son exactas.
 */
function stairBoxes(facing: string | undefined, top: boolean, shape: string): Box[] {
  const dir = facing ?? "east";
  const alongAxis: 0 | 2 = dir === "east" || dir === "west" ? 0 : 2;
  const sideAxis: 0 | 2 = alongAxis === 0 ? 2 : 0;
  const high: [number, number] = dir === "east" || dir === "south" ? [0.5, 1] : [0, 0.5];
  const back: [number, number] = dir === "east" || dir === "south" ? [0, 0.5] : [0.5, 1];
  // Izquierda y derecha vistas desde quien mira en la dirección de facing.
  const leftLow = dir === "east" || dir === "north";
  const left: [number, number] = leftLow ? [0, 0.5] : [0.5, 1];
  const right: [number, number] = leftLow ? [0.5, 1] : [0, 0.5];
  const full: [number, number] = [0, 1];

  // Rango vertical de la mitad completa y del escalón.
  const baseY: [number, number] = top ? [0.5, 1] : [0, 0.5];
  const stepY: [number, number] = top ? [0, 0.5] : [0.5, 1];

  const make = (along: [number, number], side: [number, number], y: [number, number]): Box => {
    const lo: [number, number, number] = [0, y[0], 0];
    const hi: [number, number, number] = [1, y[1], 1];
    lo[alongAxis] = along[0];
    hi[alongAxis] = along[1];
    lo[sideAxis] = side[0];
    hi[sideAxis] = side[1];
    return { lo, hi };
  };

  const boxes: Box[] = [make(full, full, baseY)];
  switch (shape) {
    case "outer_left":
      boxes.push(make(high, left, stepY));
      break;
    case "outer_right":
      boxes.push(make(high, right, stepY));
      break;
    case "inner_left":
      boxes.push(make(high, full, stepY), make(back, left, stepY));
      break;
    case "inner_right":
      boxes.push(make(high, full, stepY), make(back, right, stepY));
      break;
    default:
      boxes.push(make(high, full, stepY));
  }
  return boxes;
}

/** Vidrio y cristal de colores: se dibuja con transparencia. */
export function isTransparent(block: string): boolean {
  const base = baseBlock(block);
  return base === "minecraft:glass" || base.endsWith("_stained_glass") || base === "minecraft:glass_pane" || base.endsWith("_stained_glass_pane");
}

/** Indica si las cajas de un bloque cubren toda la celda. */
export function isFullCell(block: string): boolean {
  const boxes = shapeBoxes(block);
  return (
    boxes.length === 1 &&
    !boxes[0].cross &&
    !boxes[0].when &&
    boxes[0].lo.every((v) => v === 0) &&
    boxes[0].hi.every((v) => v === 1)
  );
}
