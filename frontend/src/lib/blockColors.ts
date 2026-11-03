import type { TextureFace } from "./blockFaces";

/** Colores elegidos por el usuario, indexados por identificador de bloque. */
const overrides = new Map<string, string>();
/** Texturas subidas, como "minecraft:stone#side". */
const withTexture = new Set<string>();

export function textureKey(id: string, face: TextureFace): string {
  return `${id}#${face}`;
}

/** Sustituye los colores y las texturas conocidas (al cargar el catálogo y tras guardar). */
export function setColorOverrides(entries: { id: string; color: string | null; textureFaces?: TextureFace[] }[]): void {
  overrides.clear();
  withTexture.clear();
  for (const entry of entries) {
    if (entry.color) overrides.set(entry.id, entry.color);
    for (const face of entry.textureFaces ?? []) withTexture.add(textureKey(entry.id, face));
  }
}

/** Con cara, indica si esa cara tiene textura. Sin cara, si el bloque tiene alguna. */
export function hasTextureId(id: string, face?: TextureFace): boolean {
  if (face) return withTexture.has(textureKey(id, face));
  return withTexture.has(textureKey(id, "side")) || withTexture.has(textureKey(id, "top")) || withTexture.has(textureKey(id, "bottom"));
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
