import { baseBlock, blockProperties } from "./blockShapes";

/** Propiedad que el usuario puede elegir para un bloque (orientación, mitad, forma...). */
export interface StateOption {
  name: string;
  label: string;
  values: { value: string; label: string }[];
}

const DIRECTIONS = [
  { value: "north", label: "Norte" },
  { value: "south", label: "Sur" },
  { value: "east", label: "Este" },
  { value: "west", label: "Oeste" },
];
const FACING: StateOption = { name: "facing", label: "Orientación", values: DIRECTIONS };
const HALF: StateOption = {
  name: "half",
  label: "Mitad",
  values: [
    { value: "bottom", label: "Abajo" },
    { value: "top", label: "Arriba" },
  ],
};
const SHAPE: StateOption = {
  name: "shape",
  label: "Forma",
  values: [
    { value: "straight", label: "Recta" },
    { value: "inner_left", label: "Esquina interior izquierda" },
    { value: "inner_right", label: "Esquina interior derecha" },
    { value: "outer_left", label: "Esquina exterior izquierda" },
    { value: "outer_right", label: "Esquina exterior derecha" },
  ],
};
const OPEN: StateOption = {
  name: "open",
  label: "Abierta",
  values: [
    { value: "false", label: "No" },
    { value: "true", label: "Sí" },
  ],
};

/** Propiedades elegibles de un bloque, según su nombre base. Vacío si no tiene ninguna. */
export function stateOptions(block: string): StateOption[] {
  const base = baseBlock(block);
  if (base.endsWith("_stairs")) return [FACING, HALF, SHAPE];
  if (base.endsWith("_trapdoor")) return [FACING, HALF, OPEN];
  if (base === "minecraft:ladder" || base.endsWith("wall_torch")) return [FACING];
  return [];
}

/** Valores por defecto: el primero de cada propiedad. Así cada bloque colocado tiene su estado completo. */
export function defaultState(base: string): string {
  return composeState(base, Object.fromEntries(stateOptions(base).map((o) => [o.name, o.values[0].value])));
}

/** Une el nombre base con sus propiedades, en orden alfabético, igual que el backend. */
export function composeState(base: string, props: Record<string, string>): string {
  const entries = Object.entries(props).filter(([, v]) => v !== "").sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  if (entries.length === 0) return base;
  return `${base}[${entries.map(([k, v]) => `${k}=${v}`).join(",")}]`;
}

/** Propiedades actuales de un bloque con estado. */
export function currentState(block: string): Record<string, string> {
  return blockProperties(block);
}
