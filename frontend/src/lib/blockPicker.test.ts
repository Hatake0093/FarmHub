import { describe, expect, it } from "vitest";
import { pushRecent, resolveRecent, visibleOptions } from "./blockPicker";
import type { BlockEntry } from "../api/blocks";

const catalog: BlockEntry[] = [
  { id: "minecraft:stone", englishName: "Stone", spanishName: "Piedra", color: null, hasTexture: false },
  { id: "minecraft:hopper", englishName: "Hopper", spanishName: null, color: null, hasTexture: false },
  { id: "minecraft:chest", englishName: "Chest", spanishName: "Cofre", color: null, hasTexture: false },
];

describe("blockPicker", () => {
  it("pone el último usado primero, sin repetir y con límite", () => {
    expect(pushRecent(["a", "b"], "b")).toEqual(["b", "a"]);
    expect(pushRecent(["a", "b", "c"], "d", 3)).toEqual(["d", "a", "b"]);
  });

  it("ignora recientes que ya no están en el catálogo", () => {
    expect(resolveRecent(catalog, ["minecraft:gone", "minecraft:hopper"]).map((b) => b.id)).toEqual(["minecraft:hopper"]);
  });

  it("sin búsqueda muestra primero los recientes y luego el resto", () => {
    const ids = visibleOptions(catalog, "", ["minecraft:chest"]).map((b) => b.id);

    expect(ids).toEqual(["minecraft:chest", "minecraft:stone", "minecraft:hopper"]);
  });

  it("con búsqueda filtra por español, inglés o identificador", () => {
    expect(visibleOptions(catalog, "cofre", []).map((b) => b.id)).toEqual(["minecraft:chest"]);
    expect(visibleOptions(catalog, "hopper", []).map((b) => b.id)).toEqual(["minecraft:hopper"]);
  });
});
