import { describe, expect, it } from "vitest";
import { formatDimensions } from "./format";

describe("formatDimensions", () => {
  it("muestra las tres dimensiones", () => {
    expect(formatDimensions(10, 5, 8)).toBe("10 × 5 × 8");
  });

  it("marca las dimensiones desconocidas", () => {
    expect(formatDimensions(10, null, 8)).toBe("10 × ? × 8");
  });

  it("devuelve null si no se conoce ninguna", () => {
    expect(formatDimensions(null, null, null)).toBeNull();
  });
});
