import { describe, expect, it } from "vitest";
import { faceTextureFor, firstTexturedFace, type TextureFace } from "./blockFaces";

const only = (...faces: TextureFace[]) => (f: TextureFace) => faces.includes(f);

describe("faceTextureFor", () => {
  it("cada cara usa su propia textura cuando existe", () => {
    const has = only("side", "top", "bottom");
    expect(faceTextureFor("top", has)).toBe("top");
    expect(faceTextureFor("bottom", has)).toBe("bottom");
    expect(faceTextureFor("side", has)).toBe("side");
  });

  it("arriba y abajo recurren a la de lados si faltan", () => {
    expect(faceTextureFor("top", only("side"))).toBe("side");
    expect(faceTextureFor("bottom", only("side"))).toBe("side");
  });

  it("los lados no usan la de arriba ni la de abajo", () => {
    expect(faceTextureFor("side", only("top", "bottom"))).toBeNull();
  });

  it("sin ninguna textura devuelve null", () => {
    expect(faceTextureFor("top", only())).toBeNull();
  });
});

describe("firstTexturedFace", () => {
  it("prefiere los lados, luego arriba y abajo", () => {
    expect(firstTexturedFace(only("top", "bottom"))).toBe("top");
    expect(firstTexturedFace(only("side", "top"))).toBe("side");
    expect(firstTexturedFace(only())).toBeNull();
  });
});
