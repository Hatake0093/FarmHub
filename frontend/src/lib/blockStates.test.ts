import { describe, expect, it } from "vitest";
import { composeState, defaultState, stateOptions } from "./blockStates";

describe("blockStates", () => {
  it("ofrece orientación y mitad a las escaleras, y forma en las esquinas", () => {
    expect(stateOptions("minecraft:oak_stairs").map((o) => o.name)).toEqual(["facing", "half", "shape"]);
  });

  it("las escaleras de mano y las antorchas de pared solo ofrecen orientación", () => {
    expect(stateOptions("minecraft:ladder").map((o) => o.name)).toEqual(["facing"]);
    expect(stateOptions("minecraft:redstone_wall_torch").map((o) => o.name)).toEqual(["facing"]);
  });

  it("un bloque sin propiedades no ofrece ninguna", () => {
    expect(stateOptions("minecraft:stone")).toEqual([]);
  });

  it("el estado por defecto incluye el primer valor de cada propiedad", () => {
    expect(defaultState("minecraft:ladder")).toBe("minecraft:ladder[facing=north]");
    expect(defaultState("minecraft:stone")).toBe("minecraft:stone");
  });

  it("compone las propiedades en orden alfabético, como el backend", () => {
    expect(composeState("minecraft:oak_stairs", { shape: "straight", facing: "east", half: "top" })).toBe(
      "minecraft:oak_stairs[facing=east,half=top,shape=straight]",
    );
  });
});
