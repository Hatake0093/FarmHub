import { describe, expect, it } from "vitest";
import { blockDisplayName, searchBlocks, shortName } from "./blockSearch";
import type { BlockEntry } from "../api/blocks";

const blocks: BlockEntry[] = [
  { id: "minecraft:stone", englishName: "Stone", spanishName: "Piedra", color: null, hasTexture: false },
  { id: "minecraft:hopper", englishName: "Hopper", spanishName: null, color: null, hasTexture: false },
  { id: "minecraft:polished_andesite", englishName: "Polished Andesite", spanishName: null, color: null, hasTexture: false },
];

describe("blockSearch", () => {
  it("muestra el nombre en español cuando existe y el inglés si no", () => {
    expect(blockDisplayName(blocks[0])).toBe("Piedra");
    expect(blockDisplayName(blocks[1])).toBe("Hopper");
  });

  it("busca por español, inglés o identificador", () => {
    expect(searchBlocks(blocks, "piedra").map((b) => b.id)).toEqual(["minecraft:stone"]);
    expect(searchBlocks(blocks, "andes").map((b) => b.id)).toEqual(["minecraft:polished_andesite"]);
    expect(searchBlocks(blocks, "hopper").map((b) => b.id)).toEqual(["minecraft:hopper"]);
  });

  it("ignora tildes, mayúsculas y el orden de las palabras", () => {
    const more: BlockEntry[] = [
      ...blocks,
      { id: "minecraft:oak_door", englishName: "Oak Door", spanishName: "Puerta de roble", color: null, hasTexture: false },
      { id: "minecraft:grass_block", englishName: "Grass Block", spanishName: "Bloque de césped", color: null, hasTexture: false },
    ];
    expect(searchBlocks(more, "door oak").map((b) => b.id)).toEqual(["minecraft:oak_door"]);
    expect(searchBlocks(more, "CESPED").map((b) => b.id)).toEqual(["minecraft:grass_block"]);
    expect(searchBlocks(more, "roble puerta").map((b) => b.id)).toEqual(["minecraft:oak_door"]);
    expect(searchBlocks(more, "polished_andesite").map((b) => b.id)).toEqual(["minecraft:polished_andesite"]);
  });

  it("ordena por relevancia: exacto, empieza por, resto", () => {
    const list: BlockEntry[] = [
      { id: "minecraft:stone_bricks", englishName: "Stone Bricks", spanishName: null, color: null, hasTexture: false },
      { id: "minecraft:smooth_stone", englishName: "Smooth Stone", spanishName: null, color: null, hasTexture: false },
      { id: "minecraft:stone", englishName: "Stone", spanishName: null, color: null, hasTexture: false },
    ];
    expect(searchBlocks(list, "stone").map((b) => b.id)).toEqual([
      "minecraft:stone",
      "minecraft:stone_bricks",
      "minecraft:smooth_stone",
    ]);
  });

  it("a igual relevancia prefiere el nombre más corto", () => {
    const list: BlockEntry[] = [
      { id: "minecraft:dark_oak_door", englishName: "Dark Oak Door", spanishName: null, color: null, hasTexture: false },
      { id: "minecraft:oak_door", englishName: "Oak Door", spanishName: null, color: null, hasTexture: false },
    ];
    expect(searchBlocks(list, "door oak").map((b) => b.id)).toEqual(["minecraft:oak_door", "minecraft:dark_oak_door"]);
  });

  it("quita el espacio de nombres para la URL", () => {
    expect(shortName("minecraft:stone")).toBe("stone");
  });
});
