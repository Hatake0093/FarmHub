import { describe, expect, it } from "vitest";
import { EditHistory, type CellChange } from "./history";

const edit = (after: string): CellChange[] => [{ x: 0, y: 0, z: 0, before: "minecraft:air", after }];

describe("EditHistory", () => {
  it("deshace y rehace en orden", () => {
    const h = new EditHistory();
    h.record(edit("minecraft:stone"));
    h.record(edit("minecraft:hopper"));

    expect(h.peekUndo()?.[0].after).toBe("minecraft:hopper");
    h.markUndone();
    expect(h.peekUndo()?.[0].after).toBe("minecraft:stone");
    expect(h.peekRedo()?.[0].after).toBe("minecraft:hopper");
    h.markRedone();
    expect(h.peekRedo()).toBeNull();
    expect(h.peekUndo()?.[0].after).toBe("minecraft:hopper");
  });

  it("una edición nueva borra lo que se podía rehacer", () => {
    const h = new EditHistory();
    h.record(edit("minecraft:stone"));
    h.markUndone();
    h.record(edit("minecraft:dirt"));

    expect(h.canRedo).toBe(false);
    expect(h.canUndo).toBe(true);
  });

  it("ignora ediciones vacías", () => {
    const h = new EditHistory();
    h.record([]);

    expect(h.canUndo).toBe(false);
  });
});
