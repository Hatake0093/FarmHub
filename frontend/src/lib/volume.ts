import type { VoxelGrid } from "./isometric";

/** Volumen tal como lo envía la API: celdas como índices de 16 bits little-endian en base64. */
export interface VolumeDto {
  width: number;
  height: number;
  depth: number;
  palette: string[];
  cellsBase64: string;
}

export function gridFromVolume(dto: VolumeDto): VoxelGrid {
  const expected = dto.width * dto.height * dto.depth;
  const binary = atob(dto.cellsBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blocks = new Uint16Array(bytes.buffer);
  if (blocks.length !== expected) {
    throw new Error("El volumen recibido no coincide con sus dimensiones.");
  }
  return { width: dto.width, height: dto.height, depth: dto.depth, palette: dto.palette, blocks };
}

/** Una capa horizontal (y fijo) de un volumen, con las celdas en orden z * width + x. */
export function layerFromVolume(dto: VolumeDto, y: number): { y: number; width: number; depth: number; palette: string[]; cells: number[] } {
  const grid = gridFromVolume(dto);
  if (y < 0 || y >= grid.height) {
    throw new Error(`La capa debe estar entre 0 y ${grid.height - 1}.`);
  }
  const cells: number[] = new Array(grid.width * grid.depth);
  for (let z = 0; z < grid.depth; z++) {
    for (let x = 0; x < grid.width; x++) {
      cells[z * grid.width + x] = grid.blocks[(y * grid.depth + z) * grid.width + x];
    }
  }
  return { y, width: grid.width, depth: grid.depth, palette: grid.palette, cells };
}
