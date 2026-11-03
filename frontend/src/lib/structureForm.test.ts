import { describe, expect, it } from "vitest";
import { validateStructureForm } from "./structureForm";

const valid = { name: "Granja", width: "8", height: "4", depth: "8", baseX: "0", baseY: "64", baseZ: "-12" };

describe("validateStructureForm", () => {
  it("acepta un formulario correcto", () => {
    expect(validateStructureForm(valid)).toBeNull();
  });

  it("exige nombre", () => {
    expect(validateStructureForm({ ...valid, name: "  " })).toBe("El nombre es obligatorio.");
  });

  it("limita el tamaño a 1–200 enteros", () => {
    expect(validateStructureForm({ ...valid, width: "0" })).toContain("Ancho");
    expect(validateStructureForm({ ...valid, height: "201" })).toContain("Alto");
    expect(validateStructureForm({ ...valid, depth: "2.5" })).toContain("Profundidad");
    expect(validateStructureForm({ ...valid, depth: "" })).toContain("Profundidad");
  });

  it("limita el volumen total a 1.000.000 aunque cada lado esté dentro de 200", () => {
    expect(validateStructureForm({ ...valid, width: "100", height: "100", depth: "100" })).toBeNull();
    expect(validateStructureForm({ ...valid, width: "200", height: "200", depth: "200" })).toContain("supera el máximo");
    expect(validateStructureForm({ ...valid, width: "200", height: "200", depth: "25" })).toBeNull();
  });

  it("exige coordenadas base enteras", () => {
    expect(validateStructureForm({ ...valid, baseY: "abc" })).toContain("Coordenada base Y");
  });
});
