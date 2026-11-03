import { describe, expect, it } from "vitest";
import { matchTextureFiles } from "./textureImport";

describe("matchTextureFiles", () => {
  it("empareja por nombre sin extensión ni carpeta, sin distinguir mayúsculas", () => {
    const ids = new Set(["minecraft:stone", "minecraft:oak_planks"]);
    const files = [{ name: "textures/Stone.png" }, { name: "oak_planks.webp" }, { name: "grass_block_top.png" }];

    const result = matchTextureFiles(files, ids);

    expect(result.matched.map((m) => m.blockId)).toEqual(["minecraft:stone", "minecraft:oak_planks"]);
    expect(result.unmatched.map((f) => f.name)).toEqual(["grass_block_top.png"]);
  });
});
