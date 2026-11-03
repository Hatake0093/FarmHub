import { describe, expect, it } from "vitest";
import { overrideColor, scaleHex, setColorOverrides } from "./blockColors";
import { blockColor } from "./litematicView";
import { shade } from "./isometric";

describe("blockColors", () => {
  it("usa el color elegido por el usuario cuando existe", () => {
    setColorOverrides([{ id: "minecraft:stone", color: "#8a8a8a" }, { id: "minecraft:hopper", color: null }]);

    expect(overrideColor("minecraft:stone")).toBe("#8a8a8a");
    expect(blockColor("minecraft:stone")).toBe("#8a8a8a");
    expect(overrideColor("minecraft:hopper")).toBeUndefined();
    expect(blockColor("minecraft:hopper")).toMatch(/^hsl/);
  });

  it("la sombra isométrica oscurece o aclara el color elegido", () => {
    setColorOverrides([{ id: "minecraft:stone", color: "#ffffff" }]);

    expect(shade("minecraft:stone", 55)).toBe("rgb(255, 255, 255)");
    expect(shade("minecraft:stone", 27.5)).toBe("rgb(128, 128, 128)");
    expect(scaleHex("#000000", 2)).toBe("rgb(0, 0, 0)");
  });
});
