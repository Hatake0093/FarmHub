import { describe, expect, it } from "vitest";
import { blockColor, blockLabel, isAir } from "./litematicView";

describe("litematicView helpers", () => {
  it("reconoce los bloques de aire", () => {
    expect(isAir("minecraft:air")).toBe(true);
    expect(isAir("minecraft:cave_air")).toBe(true);
    expect(isAir("minecraft:stone")).toBe(false);
  });

  it("asigna siempre el mismo color al mismo bloque", () => {
    expect(blockColor("minecraft:hopper")).toBe(blockColor("minecraft:hopper"));
  });

  it("muestra el nombre sin el espacio de nombres", () => {
    expect(blockLabel("minecraft:oak_slab")).toBe("oak slab");
  });
});
