export type Theme = "light" | "dark";

const STORAGE_KEY = "farmhub.theme";

/** Tema guardado por el usuario, o null si nunca eligió uno (se sigue el del sistema). */
export function readStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

export function systemTheme(): Theme {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** Tema que se está mostrando ahora: el elegido o, si no hay, el del sistema. */
export function currentTheme(): Theme {
  return readStoredTheme() ?? systemTheme();
}

/** Aplica el tema al documento y lo recuerda en este navegador. */
export function applyTheme(theme: Theme, remember = true): void {
  document.documentElement.dataset.theme = theme;
  if (!remember) return;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Sin almacenamiento disponible, el tema vale solo para esta sesión.
  }
}
