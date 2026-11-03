export interface Point {
  x: number;
  y: number;
  z: number;
}

export interface Measurement {
  dx: number;
  dy: number;
  dz: number;
  distance: number;
}

/** Diferencia por eje y distancia en línea recta, en bloques. */
export function measure(a: Point, b: Point): Measurement {
  const dx = Math.abs(b.x - a.x);
  const dy = Math.abs(b.y - a.y);
  const dz = Math.abs(b.z - a.z);
  return { dx, dy, dz, distance: Math.sqrt(dx * dx + dy * dy + dz * dz) };
}
