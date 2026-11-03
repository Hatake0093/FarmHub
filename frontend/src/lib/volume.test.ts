import { describe, expect, it } from "vitest";
import { layerFromVolume, type VolumeDto } from "./volume";

function encode(values: number[]): string {
  const bytes = new Uint8Array(new Uint16Array(values).buffer);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

describe("layerFromVolume", () => {
  // 2 de ancho, 2 de alto, 2 de profundidad. Índice = (y * depth + z) * width + x.
  const dto: VolumeDto = {
    width: 2,
    height: 2,
    depth: 2,
    palette: ["minecraft:air", "minecraft:stone", "minecraft:dirt"],
    cellsBase64: encode([0, 1, 2, 0, 2, 2, 1, 0]),
  };

  it("devuelve la capa pedida con las celdas en orden z * width + x", () => {
    expect(layerFromVolume(dto, 0).cells).toEqual([0, 1, 2, 0]);
    expect(layerFromVolume(dto, 1).cells).toEqual([2, 2, 1, 0]);
  });

  it("conserva dimensiones, paleta y el número de capa", () => {
    const layer = layerFromVolume(dto, 1);
    expect(layer).toMatchObject({ y: 1, width: 2, depth: 2, palette: dto.palette });
  });

  it("rechaza una capa fuera del volumen", () => {
    expect(() => layerFromVolume(dto, 2)).toThrow();
  });
});
