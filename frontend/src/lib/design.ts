import type { VoxelGrid } from "./isometric";
import type { Box } from "./selection";

export interface Change {
  x: number;
  y: number;
  z: number;
  block: string | null;
}

const AIR = "minecraft:air";

function blockAt(grid: VoxelGrid, x: number, y: number, z: number): string {
  return grid.palette[grid.blocks[(y * grid.depth + z) * grid.width + x]];
}

/**
 * Relleno en la capa y: reemplaza el bloque conectado (en X y Z) que hay en (x, z) por `block`.
 * Null borra (pone aire). Devuelve los cambios; vacío si ya es ese bloque.
 */
export function floodFillLayer(grid: VoxelGrid, y: number, x: number, z: number, block: string | null): Change[] {
  const target = block ?? AIR;
  const start = blockAt(grid, x, y, z);
  if (start === target) return [];

  const seen = new Uint8Array(grid.width * grid.depth);
  const changes: Change[] = [];
  const queue: number[] = [x, z];
  seen[z * grid.width + x] = 1;

  while (queue.length > 0) {
    const cz = queue.pop() as number;
    const cx = queue.pop() as number;
    changes.push({ x: cx, y, z: cz, block: target === AIR ? null : target });
    const neighbours: [number, number][] = [[cx + 1, cz], [cx - 1, cz], [cx, cz + 1], [cx, cz - 1]];
    for (const [nx, nz] of neighbours) {
      if (nx < 0 || nz < 0 || nx >= grid.width || nz >= grid.depth) continue;
      const k = nz * grid.width + nx;
      if (seen[k] || blockAt(grid, nx, y, nz) !== start) continue;
      seen[k] = 1;
      queue.push(nx, nz);
    }
  }
  return changes;
}

/** Refleja la caja dentro de sí misma en X (horizontal) o Z (vertical en la vista). */
export function mirrorBox(grid: VoxelGrid, box: Box, axis: "x" | "z"): Change[] {
  const changes: Change[] = [];
  for (let y = box.y0; y <= box.y1; y++) {
    for (let z = box.z0; z <= box.z1; z++) {
      for (let x = box.x0; x <= box.x1; x++) {
        const sx = axis === "x" ? box.x1 - (x - box.x0) : x;
        const sz = axis === "z" ? box.z1 - (z - box.z0) : z;
        const source = blockAt(grid, sx, y, sz);
        if (source !== blockAt(grid, x, y, z)) {
          changes.push({ x, y, z, block: source === AIR ? null : source });
        }
      }
    }
  }
  return changes;
}

/**
 * Gira 90° en el sentido de las agujas del reloj la caja, dentro de sí misma. Solo es posible si la
 * caja es cuadrada en X y Z. Devuelve null si no lo es.
 */
export function rotateBoxQuarter(grid: VoxelGrid, box: Box): Change[] | null {
  const n = box.x1 - box.x0 + 1;
  if (n !== box.z1 - box.z0 + 1) return null;
  const changes: Change[] = [];
  for (let y = box.y0; y <= box.y1; y++) {
    for (let v = 0; v < n; v++) {
      for (let u = 0; u < n; u++) {
        // Destino (u, v) toma el origen: u' = n-1-v', v' = u... inverso: origen u = v_dest, v = n-1-u_dest.
        const destU = u;
        const destV = v;
        const srcU = destV;
        const srcV = n - 1 - destU;
        const source = blockAt(grid, box.x0 + srcU, y, box.z0 + srcV);
        const x = box.x0 + destU;
        const z = box.z0 + destV;
        if (source !== blockAt(grid, x, y, z)) {
          changes.push({ x, y, z, block: source === AIR ? null : source });
        }
      }
    }
  }
  return changes;
}
