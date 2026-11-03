import { describe, expect, it } from "vitest";
import { formatBytes, validateUpload } from "./files";

describe("validateUpload", () => {
  it("acepta .litematic y tipos de imagen y PDF sin distinguir mayúsculas", () => {
    expect(validateUpload({ name: "granja.litematic", size: 10 })).toBeNull();
    expect(validateUpload({ name: "PREVIEW.PNG", size: 10 })).toBeNull();
    expect(validateUpload({ name: "guia.pdf", size: 10 })).toBeNull();
  });

  it("rechaza extensiones no admitidas", () => {
    expect(validateUpload({ name: "script.exe", size: 10 })).toMatch(/no admitido/);
    expect(validateUpload({ name: "farm.schem", size: 10 })).toMatch(/no admitido/);
    expect(validateUpload({ name: "sin-extension", size: 10 })).toMatch(/no admitido/);
  });

  it("rechaza archivos vacíos y los que superan 25 MB", () => {
    expect(validateUpload({ name: "a.pdf", size: 0 })).toMatch(/vacío/);
    expect(validateUpload({ name: "a.pdf", size: 25 * 1024 * 1024 + 1 })).toMatch(/25 MB/);
  });
});

describe("formatBytes", () => {
  it("usa B, KB y MB según el tamaño", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(3 * 1024 * 1024)).toBe("3.0 MB");
  });
});
