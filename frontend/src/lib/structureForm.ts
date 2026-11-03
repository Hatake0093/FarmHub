/** Deben coincidir con StructureGrid del backend. */
export const MAX_DIMENSION = 200;
export const MAX_VOLUME = 1_000_000;

function isInt(value: string, min: number, max: number): boolean {
  const n = Number(value);
  return value.trim() !== "" && Number.isInteger(n) && n >= min && n <= max;
}

/** Devuelve el primer problema del formulario, o null si todo está bien. */
export function validateStructureForm(form: { name: string; width: string; height: string; depth: string; baseX: string; baseY: string; baseZ: string }): string | null {
  if (!form.name.trim()) return "El nombre es obligatorio.";
  for (const [label, value] of [["Ancho", form.width], ["Alto", form.height], ["Profundidad", form.depth]] as const) {
    if (!isInt(value, 1, MAX_DIMENSION)) return `${label}: debe ser un entero entre 1 y ${MAX_DIMENSION}.`;
  }
  const volume = Number(form.width) * Number(form.height) * Number(form.depth);
  if (volume > MAX_VOLUME) {
    return `El volumen (${volume.toLocaleString("es-ES")} bloques) supera el máximo de ${MAX_VOLUME.toLocaleString("es-ES")}. Por ejemplo, 100 × 100 × 100 es el máximo cúbico.`;
  }
  for (const [label, value] of [["X", form.baseX], ["Y", form.baseY], ["Z", form.baseZ]] as const) {
    if (!isInt(value, -30_000_000, 30_000_000)) return `Coordenada base ${label}: debe ser un número entero.`;
  }
  return null;
}
