import { describe, expect, it } from "vitest";
import { parseTags } from "./tags";

describe("parseTags", () => {
  it("separa por comas, recorta espacios y elimina vacíos", () => {
    expect(parseTags(" mobs, xp ,, automática ")).toEqual(["mobs", "xp", "automática"]);
  });

  it("elimina duplicados conservando el orden", () => {
    expect(parseTags("mobs, xp, mobs")).toEqual(["mobs", "xp"]);
  });

  it("devuelve una lista vacía si no hay etiquetas", () => {
    expect(parseTags("  ,  ")).toEqual([]);
  });
});
