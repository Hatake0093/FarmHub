import { describe, expect, it } from "vitest";
import { baseBlock, blockProperties, isFullCell, isTransparent, shapeBoxes } from "./blockShapes";

describe("blockShapes", () => {
  it("separa el nombre base de las propiedades", () => {
    expect(baseBlock("minecraft:oak_slab[type=top,waterlogged=false]")).toBe("minecraft:oak_slab");
    expect(baseBlock("minecraft:stone")).toBe("minecraft:stone");
  });

  it("lee las propiedades de un identificador con estado", () => {
    expect(blockProperties("minecraft:oak_slab[type=top,waterlogged=false]")).toEqual({
      type: "top",
      waterlogged: "false",
    });
    expect(blockProperties("minecraft:stone")).toEqual({});
  });

  it("una losa inferior ocupa la mitad de abajo, la superior la de arriba y la doble la celda entera", () => {
    expect(shapeBoxes("minecraft:stone_slab[type=bottom]")).toEqual([{ lo: [0, 0, 0], hi: [1, 0.5, 1] }]);
    expect(shapeBoxes("minecraft:stone_slab[type=top]")).toEqual([{ lo: [0, 0.5, 0], hi: [1, 1, 1] }]);
    expect(isFullCell("minecraft:stone_slab[type=double]")).toBe(true);
  });

  it("sin propiedad de tipo, una losa se trata como inferior", () => {
    expect(shapeBoxes("minecraft:oak_slab")).toEqual([{ lo: [0, 0, 0], hi: [1, 0.5, 1] }]);
    expect(isFullCell("minecraft:oak_slab")).toBe(false);
  });

  it("los bloques sin forma especial ocupan la celda", () => {
    expect(isFullCell("minecraft:stone")).toBe(true);
  });

  it("reconoce el vidrio y los cristales de colores, pero no otros bloques", () => {
    expect(isTransparent("minecraft:glass")).toBe(true);
    expect(isTransparent("minecraft:light_blue_stained_glass")).toBe(true);
    expect(isTransparent("minecraft:glass_pane")).toBe(true);
    expect(isTransparent("minecraft:tinted_glass")).toBe(false);
    expect(isTransparent("minecraft:stone")).toBe(false);
  });
});
