import { describe, expect, it } from "vitest";
import { faceTransform } from "./textures";

describe("faceTransform", () => {
  it("lleva las esquinas de la imagen a las esquinas de la cara", () => {
    // Cara de 20 × 10 píxeles en el lienzo, imagen de 10 × 10.
    const t = faceTransform({ x: 5, y: 5 }, { x: 25, y: 5 }, { x: 5, y: 15 }, 10, 10);

    // Esquina (10, 0) de la imagen -> arriba-derecha de la cara.
    expect(t.a * 10 + t.c * 0 + t.e).toBe(25);
    expect(t.b * 10 + t.d * 0 + t.f).toBe(5);
    // Esquina (0, 10) -> abajo-izquierda.
    expect(t.a * 0 + t.c * 10 + t.e).toBe(5);
    expect(t.b * 0 + t.d * 10 + t.f).toBe(15);
  });
});
