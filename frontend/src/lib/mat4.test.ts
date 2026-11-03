import { describe, expect, it } from "vitest";
import { identity, lookAt, multiply, perspective, scale, transformPoint, translate } from "./mat4";

describe("mat4", () => {
  it("multiplicar por la identidad no cambia la matriz y mueve el origen con la traslación", () => {
    const t = translate(1, 2, 3);
    expect(Array.from(multiply(identity(), t))).toEqual(Array.from(t));
    expect(transformPoint(t, [0, 0, 0])).toEqual([1, 2, 3, 1]);
  });

  it("la escala y la traslación se componen en el orden esperado", () => {
    const m = multiply(translate(10, 0, 0), scale(2));
    expect(transformPoint(m, [1, 0, 0])[0]).toBe(12);
  });

  it("la cámara mira el objetivo desde la distancia indicada", () => {
    const view = lookAt([0, 0, 5], [0, 0, 0], [0, 1, 0]);
    const [x, y, z] = transformPoint(view, [0, 0, 0]);
    expect([x, y, z]).toEqual([0, 0, -5]);
  });

  it("la perspectiva divide por profundidad a través de w", () => {
    expect(perspective(Math.PI / 3, 1, 0.1, 100)[11]).toBe(-1);
  });
});
