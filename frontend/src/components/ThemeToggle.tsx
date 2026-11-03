import { useState } from "react";
import { applyTheme, currentTheme, type Theme } from "../lib/theme";

/** Botón que alterna entre modo claro y oscuro. Parte del tema del sistema y recuerda la elección. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => currentTheme());
  const next: Theme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      className="button theme-toggle"
      aria-label={next === "dark" ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
      title={next === "dark" ? "Modo oscuro" : "Modo claro"}
      onClick={() => {
        applyTheme(next);
        setTheme(next);
      }}
    >
      <span aria-hidden="true">{theme === "dark" ? "☀️" : "🌙"}</span>
    </button>
  );
}
