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

  it("una antorcha de pie es un poste fino y centrado", () => {
    const [box] = shapeBoxes("minecraft:torch");
    expect(box.lo).toEqual([7 / 16, 0, 7 / 16]);
    expect(box.hi).toEqual([9 / 16, 10 / 16, 9 / 16]);
    expect(box.fit).toBe(true);
  });

  it("una antorcha de pared se separa de la pared según facing", () => {
    const [east] = shapeBoxes("minecraft:wall_torch[facing=east]");
    const [west] = shapeBoxes("minecraft:wall_torch[facing=west]");
    // facing=east: la pared está al oeste, así que el poste queda en la mitad oeste de la celda.
    expect(east.lo[0]).toBeLessThan(0.5);
    expect(west.lo[0]).toBeGreaterThan(0.5);
  });

  it("las variantes de redstone y de alma usan la misma forma", () => {
    expect(shapeBoxes("minecraft:redstone_torch")).toEqual(shapeBoxes("minecraft:torch"));
    expect(shapeBoxes("minecraft:soul_wall_torch[facing=north]")).toEqual(shapeBoxes("minecraft:wall_torch[facing=north]"));
  });

  it("alfombras, cables de redstone y placas de presión son planos de 1/16", () => {
    for (const id of ["minecraft:red_carpet", "minecraft:redstone_wire", "minecraft:stone_pressure_plate"]) {
      const [box] = shapeBoxes(id);
      expect(box.hi[1]).toBeCloseTo(1 / 16);
    }
  });

  it("una valla tiene un brazo por cada lado conectado", () => {
    expect(shapeBoxes("minecraft:oak_fence[east=false,north=false,south=false,west=false]")).toHaveLength(1);
    expect(shapeBoxes("minecraft:oak_fence[east=true,north=true,south=false,west=false]")).toHaveLength(3);
  });

  it("una escalera tiene la base y un escalón", () => {
    expect(shapeBoxes("minecraft:oak_stairs[facing=east,half=bottom]")).toHaveLength(2);
  });

  it("una trampilla cerrada y abajo ocupa solo la parte baja", () => {
    const [box] = shapeBoxes("minecraft:oak_trapdoor[half=bottom,open=false]");
    expect(box.hi[1]).toBeCloseTo(3 / 16);
  });

  it("la mitad superior de una escalera tiene el escalón debajo y la base arriba", () => {
    const boxes = shapeBoxes("minecraft:oak_stairs[facing=east,half=top]");
    const base = boxes[0];
    const step = boxes[1];
    expect(base.lo[1]).toBeCloseTo(0.5);
    expect(step.hi[1]).toBeCloseTo(0.5);
  });

  it("una esquina exterior deja solo un cuarto del escalón", () => {
    const [, step] = shapeBoxes("minecraft:oak_stairs[facing=east,half=bottom,shape=outer_left]");
    expect(step.lo[2]).toBeCloseTo(0);
    expect(step.hi[2]).toBeCloseTo(0.5);
  });

  it("una escalera de mano tiene dos largueros y peldaños, no una hoja plana", () => {
    const boxes = shapeBoxes("minecraft:ladder[facing=north]");
    expect(boxes).toHaveLength(6);
    // Los largueros llegan a los dos lados de la celda.
    expect(boxes[0].lo[0]).toBeCloseTo(0);
    expect(boxes[1].hi[0]).toBeCloseTo(1);
  });
  it("una puerta de valla cerrada va de lado a lado y, al abrirse, sus hojas giran hacia facing", () => {
    const closed = shapeBoxes("minecraft:oak_fence_gate[facing=south,in_wall=false,open=false]");
    expect(closed).toHaveLength(8);
    // Cerrada y mirando al sur, la hoja ocupa todo x en la franja central de z.
    expect(Math.min(...closed.map((b) => b.lo[0]))).toBe(0);
    expect(Math.max(...closed.map((b) => b.hi[0]))).toBe(1);
    expect(closed.every((b) => b.lo[2] >= 7 / 16 && b.hi[2] <= 9 / 16)).toBe(true);

    const open = shapeBoxes("minecraft:oak_fence_gate[facing=south,open=true]");
    expect(Math.max(...open.map((b) => b.hi[2]))).toBeCloseTo(15 / 16);
    // Mirando al este, la hoja abierta sale hacia +x.
    const east = shapeBoxes("minecraft:oak_fence_gate[facing=east,open=true]");
    expect(Math.max(...east.map((b) => b.hi[0]))).toBeCloseTo(15 / 16);
    expect(Math.min(...east.map((b) => b.lo[0]))).toBeCloseTo(7 / 16);
  });

  it("una puerta de valla cerrada mirando al este va a lo largo de z", () => {
    const boxes = shapeBoxes("minecraft:oak_fence_gate[facing=east,open=false]");
    expect(boxes.every((b) => b.lo[0] >= 7 / 16 && b.hi[0] <= 9 / 16)).toBe(true);
    expect(Math.max(...boxes.map((b) => b.hi[2]))).toBe(1);
  });

  it("una puerta de valla en un muro baja 3/16", () => {
    const normal = shapeBoxes("minecraft:oak_fence_gate[facing=north,in_wall=false]");
    const low = shapeBoxes("minecraft:oak_fence_gate[facing=north,in_wall=true]");
    expect(Math.max(...normal.map((b) => b.hi[1]))).toBe(1);
    expect(Math.max(...low.map((b) => b.hi[1]))).toBeCloseTo(13 / 16);
  });

  it("la caña de azúcar es una cruz con textura y tallos finos sin ella", () => {
    const boxes = shapeBoxes("minecraft:sugar_cane[age=0]");
    expect(boxes.filter((b) => b.when === "textured").every((b) => b.cross)).toBe(true);
    const stalks = boxes.filter((b) => b.when === "untextured");
    expect(stalks.length).toBeGreaterThan(0);
    expect(stalks.every((b) => b.hi[0] - b.lo[0] <= 2 / 16 && b.hi[1] === 1)).toBe(true);
    expect(isFullCell("minecraft:sugar_cane")).toBe(false);
  });

  it("el yunque tiene la pieza larga arriba, girada según facing", () => {
    const south = shapeBoxes("minecraft:anvil[facing=south]");
    const east = shapeBoxes("minecraft:anvil[facing=east]");
    expect(south).toHaveLength(4);
    const topOf = (boxes: ReturnType<typeof shapeBoxes>) => boxes.find((b) => b.hi[1] === 1)!;
    expect(topOf(south).hi[2] - topOf(south).lo[2]).toBe(1);
    expect(topOf(east).hi[0] - topOf(east).lo[0]).toBe(1);
    expect(isFullCell("minecraft:anvil[facing=north]")).toBe(false);
  });

  it("el soporte de pociones tiene vara, tres bases con la textura de abajo y el plano de los brazos", () => {
    const boxes = shapeBoxes("minecraft:brewing_stand[has_bottle_0=false]");
    expect(boxes.filter((b) => b.face === "bottom")).toHaveLength(3);
    const plane = boxes.find((b) => b.when === "textured")!;
    expect(plane.lo[2]).toBe(plane.hi[2]);
  });
});
