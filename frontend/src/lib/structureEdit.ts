export interface Coordinates {
  x: number;
  y: number;
  z: number;
}

/** Coordenada del mundo de una celda local, dada la base (esquina mínima de la estructura). */
export function worldCoordinates(base: Coordinates, local: Coordinates): Coordinates {
  return { x: base.x + local.x, y: base.y + local.y, z: base.z + local.z };
}

/** Clave estable para un bloque local. */
export function cellKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

/** Bloques pendientes de guardar. null = aire (borrar). */
export type PendingChanges = Map<string, { x: number; y: number; z: number; block: string | null }>;

/** Añade un cambio sin mutar el mapa anterior. */
export function withChange(pending: PendingChanges, local: Coordinates, block: string | null): PendingChanges {
  const next = new Map(pending);
  next.set(cellKey(local.x, local.y, local.z), { ...local, block });
  return next;
}

/** Bloque que se ve en una celda: el pendiente si existe; si no, el del servidor. */
export function displayedBlock(pending: PendingChanges, local: Coordinates, serverBlock: string): string {
  const change = pending.get(cellKey(local.x, local.y, local.z));
  if (change) {
    return change.block ?? "minecraft:air";
  }
  return serverBlock;
}

/** Prepara el cuerpo de PATCH con los cambios pendientes. */
export function toPatchChanges(pending: PendingChanges) {
  return [...pending.values()];
}
