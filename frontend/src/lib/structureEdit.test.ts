import { describe, expect, it } from "vitest";
import { displayedBlock, toPatchChanges, withChange, worldCoordinates } from "./structureEdit";

describe("structureEdit", () => {
  it("la coordenada del mundo es la base más la posición local", () => {
    expect(worldCoordinates({ x: 100, y: 64, z: -20 }, { x: 2, y: 1, z: 0 })).toEqual({ x: 102, y: 65, z: -20 });
  });

  it("un cambio pendiente sustituye al bloque del servidor, y el aire borra", () => {
    let pending = withChange(new Map(), { x: 0, y: 0, z: 0 }, "minecraft:stone");
    expect(displayedBlock(pending, { x: 0, y: 0, z: 0 }, "minecraft:air")).toBe("minecraft:stone");

    pending = withChange(pending, { x: 0, y: 0, z: 0 }, null);
    expect(displayedBlock(pending, { x: 0, y: 0, z: 0 }, "minecraft:stone")).toBe("minecraft:air");
  });

  it("no muta el mapa anterior y envía solo el último cambio de cada celda", () => {
    const first = withChange(new Map(), { x: 1, y: 0, z: 0 }, "minecraft:hopper");
    const second = withChange(first, { x: 1, y: 0, z: 0 }, "minecraft:chest");

    expect(first.size).toBe(1);
    expect(first.get("1,0,0")?.block).toBe("minecraft:hopper");
    expect(toPatchChanges(second)).toEqual([{ x: 1, y: 0, z: 0, block: "minecraft:chest" }]);
  });
});
