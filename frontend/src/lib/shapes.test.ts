import { describe, expect, it } from "vitest";
import { lineCells, rectCells, shapeChanges } from "./shapes";
import type { VoxelGrid } from "./isometric";

describe("shapes", () => {
  it("una línea horizontal tiene una celda por posición", () => {
    expect(lineCells({ x: 0, z: 0 }, { x: 3, z: 0 })).toEqual([
      { x: 0, z: 0 }, { x: 1, z: 0 }, { x: 2, z: 0 }, { x: 3, z: 0 },
    ]);
  });

  it("una línea diagonal une los dos extremos sin huecos", () => {
    const cells = lineCells({ x: 0, z: 0 }, { x: 3, z: 3 });
    expect(cells).toHaveLength(4);
    expect(cells[0]).toEqual({ x: 0, z: 0 });
    expect(cells[3]).toEqual({ x: 3, z: 3 });
  });

  it("un rectángulo hueco tiene solo el borde y uno relleno tiene todo", () => {
    expect(rectCells({ x: 0, z: 0 }, { x: 2, z: 2 }, false)).toHaveLength(8);
    expect(rectCells({ x: 0, z: 0 }, { x: 2, z: 2 }, true)).toHaveLength(9);
  });

  it("solo devuelve los cambios reales", () => {
    const grid: VoxelGrid = {
      width: 2, height: 1, depth: 1,
      palette: ["minecraft:air", "minecraft:stone"],
      blocks: new Uint16Array([1, 0]),
    };
    const changes = shapeChanges(grid, "line", 0, { x: 0, z: 0 }, { x: 1, z: 0 }, "minecraft:stone");
    expect(changes).toEqual([{ x: 1, y: 0, z: 0, block: "minecraft:stone" }]);
  });
});
