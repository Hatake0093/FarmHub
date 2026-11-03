import { describe, expect, it } from "vitest";
import { measure } from "./measure";

describe("measure", () => {
  it("da la diferencia por eje y la distancia en línea recta", () => {
    const m = measure({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 });
    expect(m).toEqual({ dx: 3, dy: 4, dz: 0, distance: 5 });
  });

  it("no depende del orden de los puntos", () => {
    expect(measure({ x: 3, y: 4, z: 0 }, { x: 0, y: 0, z: 0 }).distance).toBe(5);
  });
});
