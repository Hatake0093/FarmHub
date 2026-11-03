/** Textura de bloque subida por el usuario. Se carga una vez y se guarda en caché. */

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

/** Imagen ya cargada del bloque, o undefined si todavía no existe o no se ha cargado. */
export function getTexture(blockId: string): HTMLImageElement | undefined {
  return loaded.get(blockId);
}

/** Pide la textura del bloque (una sola vez) y llama a onLoad cuando esté lista. */
export function requestTexture(blockId: string, onLoad: () => void): void {
  if (loaded.has(blockId) || requested.has(blockId)) return;
  requested.add(blockId);
  const img = new Image();
  img.onload = () => {
    loaded.set(blockId, img);
    onLoad();
  };
  img.onerror = () => requested.delete(blockId);
  img.src = `/api/blocks/${blockId.replace(/^minecraft:/, "")}/texture?v=${Date.now()}`;
}

/** Olvida la textura de un bloque tras cambiarla o borrarla, para volver a cargarla. */
export function forgetTexture(blockId: string): void {
  loaded.delete(blockId);
  requested.delete(blockId);
}
