import { describe, expect, it } from "vitest";
import { isHttpUrl } from "./url";

describe("isHttpUrl", () => {
  it("acepta http y https", () => {
    expect(isHttpUrl("https://youtube.com/watch?v=1")).toBe(true);
    expect(isHttpUrl("http://ejemplo.es")).toBe(true);
  });

  it("rechaza texto, otros protocolos y vacío", () => {
    expect(isHttpUrl("youtube.com")).toBe(false);
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl("")).toBe(false);
  });
});
