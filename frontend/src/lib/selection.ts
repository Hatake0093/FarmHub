import type { VoxelGrid } from "./isometric";

/** Caja inclusiva en coordenadas locales. */
export interface Box {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z0: number;
  z1: number;
}

export interface Delta {
  dx: number;
  dy: number;
  dz: number;
}

export interface PlannedChange {
  x: number;
  y: number;
  z: number;
  block: string | null;
}

const AIR = "minecraft:air";

export function normalizeBox(a: { x: number; z: number }, b: { x: number; z: number }, y0: number, y1: number): Box {
  return {
    x0: Math.min(a.x, b.x),
    x1: Math.max(a.x, b.x),
    z0: Math.min(a.z, b.z),
    z1: Math.max(a.z, b.z),
    y0: Math.min(y0, y1),
    y1: Math.max(y0, y1),
  };
}

function inside(box: Box, x: number, y: number, z: number): boolean {
  return x >= box.x0 && x <= box.x1 && y >= box.y0 && y <= box.y1 && z >= box.z0 && z <= box.z1;
}

/**
 * Cambios necesarios para mover la caja un desplazamiento. Las celdas del destino toman el bloque
 * de su origen; las celdas de origen que no quedan cubiertas pasan a aire. Solo se devuelven las
 * celdas que cambian. Devuelve null si el destino queda fuera de la estructura.
 */
export function planMove(grid: VoxelGrid, box: Box, delta: Delta): PlannedChange[] | null {
  const dest: Box = {
    x0: box.x0 + delta.dx, x1: box.x1 + delta.dx,
    y0: box.y0 + delta.dy, y1: box.y1 + delta.dy,
    z0: box.z0 + delta.dz, z1: box.z1 + delta.dz,
  };
  if (dest.x0 < 0 || dest.y0 < 0 || dest.z0 < 0 || dest.x1 >= grid.width || dest.y1 >= grid.height || dest.z1 >= grid.depth) {
    return null;
  }

  const blockAt = (x: number, y: number, z: number) => grid.palette[grid.blocks[(y * grid.depth + z) * grid.width + x]];
  const next = new Map<string, { x: number; y: number; z: number; target: string }>();
  const put = (x: number, y: number, z: number, target: string) => next.set(`${x},${y},${z}`, { x, y, z, target });

  // Destino: cada celda toma el bloque de su origen (leído de la rejilla original).
  for (let y = dest.y0; y <= dest.y1; y++) {
    for (let z = dest.z0; z <= dest.z1; z++) {
      for (let x = dest.x0; x <= dest.x1; x++) {
        put(x, y, z, blockAt(x - delta.dx, y - delta.dy, z - delta.dz));
      }
    }
  }
  // Origen que no queda en el destino: aire.
  for (let y = box.y0; y <= box.y1; y++) {
    for (let z = box.z0; z <= box.z1; z++) {
      for (let x = box.x0; x <= box.x1; x++) {
        if (!inside(dest, x, y, z)) put(x, y, z, AIR);
      }
    }
  }

  const changes: PlannedChange[] = [];
  for (const change of next.values()) {
    const current = blockAt(change.x, change.y, change.z);
    if (current !== change.target) {
      changes.push({ x: change.x, y: change.y, z: change.z, block: change.target === AIR ? null : change.target });
    }
  }
  return changes;
}

/**
 * Cambios para copiar la capa fromY sobre toY. Si keepDestAir es true, el aire de la capa origen no
 * borra bloques de la capa destino. Devuelve null si alguna capa está fuera de la estructura.
 */
export function planCopyLayer(grid: VoxelGrid, fromY: number, toY: number, keepDestAir: boolean): PlannedChange[] | null {
  if (fromY < 0 || toY < 0 || fromY >= grid.height || toY >= grid.height) return null;
  const layer = grid.width * grid.depth;
  const changes: PlannedChange[] = [];
  for (let i = 0; i < layer; i++) {
    const x = i % grid.width;
    const z = Math.floor(i / grid.width);
    const source = grid.palette[grid.blocks[fromY * layer + i]];
    const current = grid.palette[grid.blocks[toY * layer + i]];
    if (keepDestAir && source === AIR) continue;
    if (source !== current) {
      changes.push({ x, y: toY, z, block: source === AIR ? null : source });
    }
  }
  return changes;
}

/**
 * Cambios para copiar la caja a otra posición (el origen no cambia). Las celdas del destino toman el
 * bloque de su origen. Si keepDestAir es true, el aire del origen no borra bloques del destino.
 * Devuelve null si el destino queda fuera de la estructura.
 */
export function planCopy(grid: VoxelGrid, box: Box, delta: Delta, keepDestAir: boolean): PlannedChange[] | null {
  const dest: Box = {
    x0: box.x0 + delta.dx, x1: box.x1 + delta.dx,
    y0: box.y0 + delta.dy, y1: box.y1 + delta.dy,
    z0: box.z0 + delta.dz, z1: box.z1 + delta.dz,
  };
  if (dest.x0 < 0 || dest.y0 < 0 || dest.z0 < 0 || dest.x1 >= grid.width || dest.y1 >= grid.height || dest.z1 >= grid.depth) {
    return null;
  }
  const blockAt = (x: number, y: number, z: number) => grid.palette[grid.blocks[(y * grid.depth + z) * grid.width + x]];
  const changes: PlannedChange[] = [];
  for (let y = dest.y0; y <= dest.y1; y++) {
    for (let z = dest.z0; z <= dest.z1; z++) {
      for (let x = dest.x0; x <= dest.x1; x++) {
        const source = blockAt(x - delta.dx, y - delta.dy, z - delta.dz);
        if (keepDestAir && source === AIR) continue;
        if (blockAt(x, y, z) !== source) {
          changes.push({ x, y, z, block: source === AIR ? null : source });
        }
      }
    }
  }
  return changes;
}
