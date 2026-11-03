import { overrideColor, scaleHex } from "./blockColors";
import { isAir } from "./litematicView";

/** Rejilla completa: palette[blocks[(y*depth + z)*width + x]]. */
export interface VoxelGrid {
  width: number;
  height: number;
  depth: number;
  palette: string[];
  blocks: Uint16Array;
}

export interface LayerData {
  y: number;
  cells: number[];
  palette: string[];
}

/** Límite de celdas para la vista isométrica y de cortes (el volumen se envía en una sola petición). */
export const MAX_ISOMETRIC_VOLUME = 1_000_000;

export function gridFromLayers(width: number, height: number, depth: number, layers: LayerData[]): VoxelGrid {
  const palette = layers[0]?.palette ?? ["minecraft:air"];
  const blocks = new Uint16Array(width * height * depth);
  for (const layer of layers) {
    const base = layer.y * depth * width;
    for (let i = 0; i < layer.cells.length; i++) {
      blocks[base + i] = layer.cells[i];
    }
  }
  return { width, height, depth, palette, blocks };
}

export interface Cube {
  x: number;
  y: number;
  z: number;
  block: string;
}

/** Cubos visibles desde la cámara isométrica, del más lejano al más cercano. */
export function visibleCubes(grid: VoxelGrid): Cube[] {
  const { width, height, depth, palette, blocks } = grid;
  const solid = (x: number, y: number, z: number): boolean => {
    if (x < 0 || y < 0 || z < 0 || x >= width || y >= height || z >= depth) return false;
    return !isAir(palette[blocks[(y * depth + z) * width + x]]);
  };

  const cubes: Cube[] = [];
  for (let y = 0; y < height; y++) {
    for (let z = 0; z < depth; z++) {
      for (let x = 0; x < width; x++) {
        const block = palette[blocks[(y * depth + z) * width + x]];
        if (isAir(block)) continue;
        // La cámara mira desde +X, +Y, +Z: un cubo con los tres vecinos de esa dirección sólido no se ve.
        if (solid(x + 1, y, z) && solid(x, y + 1, z) && solid(x, y, z + 1)) continue;
        cubes.push({ x, y, z, block });
      }
    }
  }

  // Dibujar del más lejano (suma menor) al más cercano.
  cubes.sort((a, b) => a.x + a.y + a.z - (b.x + b.y + b.z));
  return cubes;
}

/** Proyección isométrica de un punto del mundo a píxeles, sin desplazamiento. */
export function project(x: number, y: number, z: number, size: number): [number, number] {
  return [(x - z) * size, (x + z) * size * 0.5 - y * size];
}

/** Color de una cara: el elegido por el usuario escalado a la luminosidad pedida (55 = color exacto). */
export function shade(block: string, lightness: number): string {
  const chosen = overrideColor(block);
  if (chosen) return scaleHex(chosen, lightness / 55);
  let hash = 0;
  for (let i = 0; i < block.length; i++) {
    hash = (hash * 31 + block.charCodeAt(i)) >>> 0;
  }
  return `hsl(${hash % 360} 50% ${lightness}%)`;
}

/**
 * Muestra solo las capas entre yFrom e yTo (ambas incluidas). Lo que queda fuera pasa a aire,
 * así que el corte se ve como una sección real. Usa un índice de aire nuevo al final de la paleta,
 * porque la paleta de un archivo no siempre tiene el aire en la posición 0.
 */
export function clipLayers(grid: VoxelGrid, yFrom: number, yTo: number): VoxelGrid {
  const airIndex = grid.palette.length;
  const palette = [...grid.palette, "minecraft:air"];
  const blocks = new Uint16Array(grid.blocks);
  const layer = grid.width * grid.depth;
  for (let y = 0; y < grid.height; y++) {
    if (y < yFrom || y > yTo) {
      blocks.fill(airIndex, y * layer, (y + 1) * layer);
    }
  }
  return { ...grid, palette, blocks };
}
