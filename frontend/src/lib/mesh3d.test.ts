import { describe, expect, it } from "vitest";
import { buildMesh, buildMeshes } from "./mesh3d";
import type { VoxelGrid } from "./isometric";

const palette = ["minecraft:air", "minecraft:stone", "minecraft:stone_slab[type=bottom]", "minecraft:stone_slab[type=top]"];
function grid(width: number, height: number, depth: number, solid: [number, number, number][]): VoxelGrid {
  const blocks = new Uint16Array(width * height * depth);
  for (const [x, y, z] of solid) blocks[(y * depth + z) * width + x] = 1;
  return { width, height, depth, palette, blocks };
}

describe("buildMesh", () => {
  it("un cubo aislado tiene 6 caras", () => {
    const mesh = buildMesh(grid(1, 1, 1, [[0, 0, 0]]), null);
    expect(mesh.faces).toBe(6);
    expect(mesh.indices.length).toBe(36);
  });

  it("dos cubos pegados no dibujan la cara que tienen en común", () => {
    const mesh = buildMesh(grid(2, 1, 1, [[0, 0, 0], [1, 0, 0]]), null);
    expect(mesh.faces).toBe(10);
  });

  it("el aire no genera caras", () => {
    const mesh = buildMesh(grid(3, 3, 3, []), null);
    expect(mesh.faces).toBe(0);
  });

  it("guarda el centro y el radio para encuadrar la vista", () => {
    const mesh = buildMesh(grid(2, 2, 2, [[0, 0, 0]]), null);
    expect(mesh.center).toEqual([1, 1, 1]);
    expect(mesh.radius).toBeCloseTo(Math.hypot(2, 2, 2) / 2);
  });

  it("una losa inferior sola tiene sus 6 caras", () => {
    const g = grid(1, 1, 1, []);
    g.blocks[0] = 2;
    expect(buildMesh(g, null).faces).toBe(6);
  });

  it("dos losas inferiores pegadas no dibujan la cara en común", () => {
    const g = grid(2, 1, 1, []);
    g.blocks[0] = 2;
    g.blocks[1] = 2;
    expect(buildMesh(g, null).faces).toBe(10);
  });

  it("un cubo al lado de una losa inferior pierde solo la cara que la losa cubre por completo", () => {
    // El cubo tiene 6 caras; la losa, 6 menos la cara que toca el cubo (su mitad de abajo queda cubierta).
    // La cara +X del cubo sigue visible en su mitad de arriba.
    const g = grid(2, 1, 1, []);
    g.blocks[0] = 1;
    g.blocks[1] = 2;
    expect(buildMesh(g, null).faces).toBe(11);
  });

  it("una losa inferior encima de un cubo tapa la cara que tienen en común", () => {
    // La mitad de abajo de la losa queda justo sobre el cubo: se pierden la cara superior del cubo
    // y la inferior de la losa, así que quedan 5 + 5 caras.
    const g = grid(1, 2, 1, []);
    g.blocks[0] = 1;
    g.blocks[1] = 2;
    expect(buildMesh(g, null).faces).toBe(10);
  });

  it("una losa superior encima de un cubo deja un hueco de aire y todas las caras visibles", () => {
    // La losa superior ocupa la mitad de arriba de la celda y deja la de abajo vacía:
    // la cara superior del cubo se ve, y la inferior de la losa también.
    const g = grid(1, 2, 1, []);
    g.blocks[0] = 1;
    g.blocks[1] = 3;
    expect(buildMesh(g, null).faces).toBe(12);
  });

  it("el vidrio va en su propia malla y no entra en la sólida", () => {
    const g = grid(1, 1, 1, []);
    const glassPalette = ["minecraft:air", "minecraft:glass"];
    const glass: VoxelGrid = { ...g, palette: glassPalette, blocks: new Uint16Array([1]) };
    const meshes = buildMeshes(glass, null);
    expect(meshes.solid.faces).toBe(0);
    expect(meshes.glass.faces).toBe(6);
  });

  it("el vidrio no tapa las caras de piedra que tiene detrás", () => {
    // Piedra en x=0 y vidrio en x=1: la cara +X de la piedra se sigue dibujando.
    const g: VoxelGrid = {
      width: 2,
      height: 1,
      depth: 1,
      palette: ["minecraft:air", "minecraft:stone", "minecraft:glass"],
      blocks: new Uint16Array([1, 2]),
    };
    const meshes = buildMeshes(g, null);
    expect(meshes.solid.faces).toBe(6);
    expect(meshes.glass.faces).toBe(5);
  });

  it("dos bloques de vidrio pegados no dibujan la cara en común", () => {
    const g: VoxelGrid = {
      width: 2,
      height: 1,
      depth: 1,
      palette: ["minecraft:air", "minecraft:white_stained_glass"],
      blocks: new Uint16Array([1, 1]),
    };
    expect(buildMeshes(g, null).glass.faces).toBe(10);
  });
});
