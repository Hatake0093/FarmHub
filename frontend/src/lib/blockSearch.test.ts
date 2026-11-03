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

  it("quita el espacio de nombres para la URL", () => {
    expect(shortName("minecraft:stone")).toBe("stone");
  });
});
