import { describe, expect, it } from "vitest";
import { plural } from "./plural";

describe("plural", () => {
  it("usa singular con 1 y plural en el resto", () => {
    expect(plural(1, "granja")).toBe("1 granja");
    expect(plural(0, "granja")).toBe("0 granjas");
    expect(plural(5, "granja")).toBe("5 granjas");
  });

  it("admite plurales irregulares", () => {
    expect(plural(2, "versión", "versiones")).toBe("2 versiones");
  });
});
