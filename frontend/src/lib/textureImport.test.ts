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

  it("un sufijo _top, _side o _bottom asigna la cara del bloque", () => {
    const ids = new Set(["minecraft:grass_block"]);
    const files = [
      { name: "grass_block_top.png" },
      { name: "grass_block_side.png" },
      { name: "grass_block_bottom.png" },
    ];

    const result = matchTextureFiles(files, ids);

    expect(result.matched.map((m) => [m.blockId, m.face])).toEqual([
      ["minecraft:grass_block", "top"],
      ["minecraft:grass_block", "side"],
      ["minecraft:grass_block", "bottom"],
    ]);
  });

  it("un nombre exacto de bloque va a la cara de lados", () => {
    const result = matchTextureFiles([{ name: "stone.png" }], new Set(["minecraft:stone"]));
    expect(result.matched[0].face).toBe("side");
  });
});
