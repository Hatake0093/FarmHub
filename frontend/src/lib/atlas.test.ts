import { describe, expect, it } from "vitest";
import { atlasLayout, TILE } from "./atlas";

describe("atlasLayout", () => {
  it("reparte las texturas en una cuadrícula casi cuadrada", () => {
    expect(atlasLayout(1)).toEqual({ cols: 1, rows: 1, width: TILE, height: TILE });
    expect(atlasLayout(5)).toEqual({ cols: 3, rows: 2, width: 3 * TILE, height: 2 * TILE });
  });
});
