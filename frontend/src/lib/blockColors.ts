/** Colores elegidos por el usuario, indexados por identificador de bloque. */
const overrides = new Map<string, string>();
/** Bloques que tienen textura subida por el usuario. */
const withTexture = new Set<string>();

/** Sustituye los colores y las texturas conocidas (al cargar el catálogo y tras guardar). */
export function setColorOverrides(entries: { id: string; color: string | null; hasTexture?: boolean }[]): void {
  overrides.clear();
  withTexture.clear();
  for (const entry of entries) {
    if (entry.color) overrides.set(entry.id, entry.color);
    if (entry.hasTexture) withTexture.add(entry.id);
  }
}

export function hasTextureId(id: string): boolean {
  return withTexture.has(id);
}

export function overrideColor(id: string): string | undefined {
  return overrides.get(id);
}

/** Escala un color #rrggbb por un factor de luminosidad (1 = igual). */
export function scaleHex(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  const channel = (shift: number) => Math.max(0, Math.min(255, Math.round(((n >> shift) & 255) * factor)));
  return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`;
}
