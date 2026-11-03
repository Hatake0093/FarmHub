/** Muestra una cantidad por hora sin ceros decimales sobrantes: 1200.5000 -> "1200.5". */
export function formatAmount(value: number): string {
  return value.toLocaleString("es-ES", { maximumFractionDigits: 4 });
}

/** Dimensiones como "10 × 5 × 8". Devuelve null si no hay ninguna. */
export function formatDimensions(x: number | null, y: number | null, z: number | null): string | null {
  if (x === null && y === null && z === null) return null;
  return [x, y, z].map((v) => (v === null ? "?" : String(v))).join(" × ");
}
