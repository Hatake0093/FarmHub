import { describe, expect, it } from "vitest";
import { gridFromLayers, project, visibleCubes, type VoxelGrid } from "./isometric";

const palette = ["minecraft:air", "minecraft:stone"];

function grid(width: number, height: number, depth: number, solid: [number, number, number][]): VoxelGrid {
  const blocks = new Uint16Array(width * height * depth);
  for (const [x, y, z] of solid) {
    blocks[(y * depth + z) * width + x] = 1;
  }
  return { width, height, depth, palette, blocks };
}

describe("isometric", () => {
  it("gridFromLayers coloca cada capa en su altura", () => {
    const layers = [
      { y: 0, cells: [1, 0, 0, 0], palette },
      { y: 1, cells: [0, 0, 0, 1], palette },
    ];

    const g = gridFromLayers(2, 2, 2, layers);

    expect(g.blocks[0]).toBe(1);
    expect(g.blocks[7]).toBe(1);
  });

  it("omite el aire y los cubos totalmente tapados", () => {
    // Bloque central rodeado por sus vecinos de +X, +Y y +Z: no se ve.
    const g = grid(3, 3, 3, [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 1]]);

    const cubes = visibleCubes(g).map((c) => `${c.x},${c.y},${c.z}`);

    expect(cubes).not.toContain("0,0,0");
    expect(cubes).toContain("1,1,1");
  });

  it("ordena del más lejano al más cercano", () => {
    const g = grid(3, 1, 1, [[0, 0, 0], [2, 0, 0]]);

    const order = visibleCubes(g).map((c) => c.x);

    expect(order).toEqual([0, 2]);
  });

  it("proyecta un eje X hacia la derecha y bajando", () => {
    expect(project(1, 0, 0, 10)).toEqual([10, 5]);
    expect(project(0, 1, 0, 10)).toEqual([0, -10]);
  });
});

describe("clipLayers", () => {
  it("deja solo las capas del rango y el resto pasa a aire", async () => {
    const { clipLayers } = await import("./isometric");
    const g = grid(2, 3, 1, [[0, 0, 0], [0, 1, 0], [0, 2, 0]]);

    const clipped = clipLayers(g, 1, 1);

    expect(clipped.palette[clipped.blocks[0]]).toBe("minecraft:air");
    expect(clipped.palette[clipped.blocks[2]]).toBe("minecraft:stone");
    expect(clipped.palette[clipped.blocks[4]]).toBe("minecraft:air");
  });

  it("no modifica la rejilla original", async () => {
    const { clipLayers } = await import("./isometric");
    const g = grid(1, 2, 1, [[0, 0, 0], [0, 1, 0]]);

    clipLayers(g, 1, 1);

    expect(g.blocks[0]).toBe(1);
  });
});

describe("rotateGrid", () => {
  it("cuatro giros de 90° devuelven la rejilla original", async () => {
    const { rotateGrid } = await import("./isometric");
    const g = grid(3, 2, 4, [[0, 0, 0], [2, 1, 3], [1, 0, 2]]);

    const back = rotateGrid(g, 4);

    expect(back.width).toBe(3);
    expect(back.depth).toBe(4);
    expect(Array.from(back.blocks)).toEqual(Array.from(g.blocks));
  });

  it("intercambia ancho y fondo y coloca cada bloque en su nueva posición", async () => {
    const { rotateGrid } = await import("./isometric");
    const g = grid(3, 1, 2, [[0, 0, 0]]);

    const r = rotateGrid(g, 1);

    // (x=0, z=0) -> (nx = depth-1-0 = 1, nz = 0): nuevo ancho 2, fondo 3.
    expect(r.width).toBe(2);
    expect(r.depth).toBe(3);
    expect(r.blocks[(0 * 2 + 0) * 2 + 1]).toBe(1);
  });
});
