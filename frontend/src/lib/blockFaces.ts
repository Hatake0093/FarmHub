/** Caras con textura propia. Las caras geométricas se resuelven con la textura de su cara o con la de lados. */
export type TextureFace = "side" | "top" | "bottom";

export const TEXTURE_FACES: TextureFace[] = ["side", "top", "bottom"];

/**
 * Textura que usa una cara: arriba usa la de arriba y, si falta, la de lados; abajo, lo mismo con la de abajo.
 * Los lados solo usan la suya. Devuelve null si no hay ninguna disponible (se pinta el color).
 */
export function faceTextureFor(face: TextureFace, has: (f: TextureFace) => boolean): TextureFace | null {
  if (face !== "side" && has(face)) return face;
  return has("side") ? "side" : null;
}

/** Primera cara con textura, en el orden lados, arriba, abajo. Sirve para miniaturas. */
export function firstTexturedFace(has: (f: TextureFace) => boolean): TextureFace | null {
  return TEXTURE_FACES.find((f) => has(f)) ?? null;
}
