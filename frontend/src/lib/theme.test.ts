import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyTheme, currentTheme, readStoredTheme } from "./theme";

function mockSystem(dark: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: dark && query.includes("dark") }));
}

describe("theme", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });
  afterEach(() => vi.unstubAllGlobals());

  it("sin elección guardada sigue el tema del sistema", () => {
    mockSystem(true);
    expect(readStoredTheme()).toBeNull();
    expect(currentTheme()).toBe("dark");
    mockSystem(false);
    expect(currentTheme()).toBe("light");
  });

  it("la elección guardada gana sobre el sistema y se aplica al documento", () => {
    mockSystem(true);
    applyTheme("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(readStoredTheme()).toBe("light");
    expect(currentTheme()).toBe("light");
  });

  it("ignora valores guardados no válidos", () => {
    localStorage.setItem("farmhub.theme", "azul");
    expect(readStoredTheme()).toBeNull();
  });
});
