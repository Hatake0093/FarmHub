/** Texturas de bloque subidas por el usuario, una por cara. Se cargan una vez y se guardan en caché. */
import { textureKey } from "./blockColors";
import { faceTextureFor, type TextureFace } from "./blockFaces";
import { baseBlock } from "./blockShapes";

export interface Point {
  x: number;
  y: number;
}

/** Matriz afín: convierte coordenadas de imagen (0..w, 0..h) en coordenadas del lienzo. */
export interface AffineTransform {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

/**
 * Transformación para pintar una imagen de w × h sobre una cara con tres esquinas conocidas:
 * arriba-izquierda (tl), arriba-derecha (tr) y abajo-izquierda (bl).
 */
export function faceTransform(tl: Point, tr: Point, bl: Point, w: number, h: number): AffineTransform {
  return {
    a: (tr.x - tl.x) / w,
    b: (tr.y - tl.y) / w,
    c: (bl.x - tl.x) / h,
    d: (bl.y - tl.y) / h,
    e: tl.x,
    f: tl.y,
  };
}

const loaded = new Map<string, HTMLImageElement>();
const requested = new Set<string>();

/** Imagen ya cargada de una cara del bloque, o undefined si todavía no existe o no se ha cargado. */
export function getTexture(blockId: string, face: TextureFace = "side"): HTMLImageElement | undefined {
  return loaded.get(textureKey(blockId, face));
}

/** Textura ya cargada que usa una cara del bloque (su propia, o la de lados si falta). */
export function resolveFaceTexture(blockId: string, face: TextureFace): HTMLImageElement | undefined {
  const base = baseBlock(blockId);
  const chosen = faceTextureFor(face, (f) => getTexture(base, f) !== undefined);
  return chosen ? getTexture(base, chosen) : undefined;
}

/** Imagen ya cargada por su clave ("id#cara"). */
export function getTextureByKey(key: string): HTMLImageElement | undefined {
  return loaded.get(key);
}

/** Pide la textura de una cara (una sola vez) y llama a onLoad cuando esté lista. */
export function requestTexture(blockId: string, face: TextureFace, onLoad: () => void): void {
  const key = textureKey(blockId, face);
  if (loaded.has(key) || requested.has(key)) return;
  requested.add(key);
  const img = new Image();
  img.onload = () => {
    loaded.set(key, img);
    onLoad();
  };
  img.onerror = () => requested.delete(key);
  const short = blockId.replace(/^minecraft:/, "");
  img.src = `/api/blocks/${short}/texture/${face}?v=${Date.now()}`;
}

/** Olvida las texturas de un bloque (todas sus caras, o solo una) tras cambiarlas o borrarlas. */
export function forgetTexture(blockId: string, face?: TextureFace): void {
  const faces: TextureFace[] = face ? [face] : ["side", "top", "bottom"];
  for (const f of faces) {
    const key = textureKey(blockId, f);
    loaded.delete(key);
    requested.delete(key);
  }
}
