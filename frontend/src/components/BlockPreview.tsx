import { faceTextureFor, type TextureFace } from "../lib/blockFaces";
import { faceTransform, type Point } from "../lib/textures";

interface Props {
  /** Identificador corto, sin "minecraft:". */
  name: string;
  faces: TextureFace[];
  color: string;
  /** Versión por cara para recargar la imagen tras subir una nueva. */
  version?: (face: TextureFace) => number;
  size?: number;
}

// Cubo isométrico en un lienzo de 32 × 34.
const T: Point = { x: 16, y: 0 };
const R: Point = { x: 32, y: 8 };
const C: Point = { x: 16, y: 16 };
const L: Point = { x: 0, y: 8 };
const BL: Point = { x: 0, y: 26 };
const BC: Point = { x: 16, y: 34 };
const BR: Point = { x: 32, y: 26 };

const FACES = [
  { key: "top", texture: "top" as TextureFace, tl: L, tr: T, bl: C, poly: [L, T, R, C], shade: 0 },
  { key: "left", texture: "side" as TextureFace, tl: L, tr: C, bl: BL, poly: [L, C, BC, BL], shade: 0.18 },
  { key: "right", texture: "side" as TextureFace, tl: C, tr: R, bl: BC, poly: [C, R, BR, BC], shade: 0.36 },
];

const points = (poly: Point[]) => poly.map((p) => `${p.x},${p.y}`).join(" ");

/** Vista previa del bloque: un cubo isométrico con sus texturas (arriba y lados) o su color. */
export function BlockPreview({ name, faces, color, version, size = 32 }: Props) {
  const has = (f: TextureFace) => faces.includes(f);
  return (
    <svg
      className="block-preview"
      viewBox="0 0 32 34"
      width={size}
      height={(size * 34) / 32}
      aria-hidden="true"
    >
      {FACES.map((face) => {
        const chosen = faceTextureFor(face.texture, has);
        const t = faceTransform(face.tl, face.tr, face.bl, 16, 16);
        return (
          <g key={face.key}>
            {chosen ? (
              <image
                href={`/api/blocks/${name}/texture/${chosen}?v=${version?.(chosen) ?? 0}`}
                width={16}
                height={16}
                preserveAspectRatio="none"
                transform={`matrix(${t.a} ${t.b} ${t.c} ${t.d} ${t.e} ${t.f})`}
              />
            ) : (
              <polygon points={points(face.poly)} fill={color} />
            )}
            {face.shade > 0 && <polygon points={points(face.poly)} fill="#000" opacity={face.shade} />}
          </g>
        );
      })}
    </svg>
  );
}
