import { useEffect, useMemo, useRef, useState } from "react";
import { faceTransform, getTexture, requestTexture } from "../lib/textures";
import { hasTextureId } from "../lib/blockColors";
import { project, shade, visibleCubes, type VoxelGrid } from "../lib/isometric";

interface Props {
  grid: VoxelGrid;
}

const MAX_WIDTH = 880;
const PADDING = 12;

/** Vista isométrica estática de una rejilla. Las caras se pintan de más lejanas a más cercanas. */
export function IsometricView({ grid }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Cambia cuando llega una textura nueva, para volver a dibujar.
  const [textureTick, setTextureTick] = useState(0);

  const cubes = useMemo(() => visibleCubes(grid), [grid]);

  const size = useMemo(() => {
    // Tamaño de cubo que hace caber la figura en el ancho disponible.
    const span = grid.width + grid.depth;
    return Math.max(2, Math.min(24, Math.floor(MAX_WIDTH / span)));
  }, [grid]);

  // Pide las texturas de los bloques visibles que tienen una subida.
  useEffect(() => {
    const seen = new Set<string>();
    for (const cube of cubes) {
      if (!seen.has(cube.block) && hasTextureId(cube.block)) {
        seen.add(cube.block);
        requestTexture(cube.block, () => setTextureTick((t) => t + 1));
      }
    }
  }, [cubes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // Límites de la figura en píxeles, para centrarla.
    const minX = -grid.depth * size;
    const maxX = grid.width * size;
    const minY = -grid.height * size;
    const maxY = ((grid.width + grid.depth) * size) / 2;

    canvas.width = maxX - minX + PADDING * 2;
    canvas.height = maxY - minY + PADDING * 2;
    const originX = -minX + PADDING;
    const originY = -minY + PADDING;

    ctx.fillStyle = "#1b1e1a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const put = (x: number, y: number, z: number): [number, number] => {
      const [px, py] = project(x, y, z, size);
      return [originX + px, originY + py];
    };

    ctx.imageSmoothingEnabled = false;

    const polygon = (points: [number, number][]) => {
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
      ctx.closePath();
    };

    // Cara = cuatro esquinas + las tres esquinas de la textura (arriba-izq., arriba-der., abajo-izq.).
    // Si el bloque tiene textura se pinta encima con un oscurecimiento según la orientación; si no, color plano.
    const face = (
      corners: [number, number][],
      block: string,
      lightness: number,
      topLeft: [number, number],
      topRight: [number, number],
      bottomLeft: [number, number],
      darken: number,
    ) => {
      const texture = getTexture(block);
      polygon(corners);
      if (!texture) {
        ctx.fillStyle = shade(block, lightness);
        ctx.fill();
        return;
      }
      ctx.save();
      ctx.clip();
      const t = faceTransform(
        { x: topLeft[0], y: topLeft[1] },
        { x: topRight[0], y: topRight[1] },
        { x: bottomLeft[0], y: bottomLeft[1] },
        texture.naturalWidth,
        texture.naturalHeight,
      );
      ctx.setTransform(t.a, t.b, t.c, t.d, t.e, t.f);
      ctx.drawImage(texture, 0, 0);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (darken > 0) {
        ctx.fillStyle = `rgba(0, 0, 0, ${darken})`;
        ctx.fill();
      }
      ctx.restore();
    };

    for (const cube of cubes) {
      const { x, y, z, block } = cube;
      // Cara superior (+Y): sin oscurecer
      face(
        [put(x, y + 1, z), put(x + 1, y + 1, z), put(x + 1, y + 1, z + 1), put(x, y + 1, z + 1)],
        block, 68,
        put(x, y + 1, z), put(x + 1, y + 1, z), put(x, y + 1, z + 1), 0,
      );
      // Cara +Z (izquierda en pantalla)
      face(
        [put(x, y, z + 1), put(x + 1, y, z + 1), put(x + 1, y + 1, z + 1), put(x, y + 1, z + 1)],
        block, 52,
        put(x, y + 1, z + 1), put(x + 1, y + 1, z + 1), put(x, y, z + 1), 0.2,
      );
      // Cara +X (derecha en pantalla)
      face(
        [put(x + 1, y, z), put(x + 1, y, z + 1), put(x + 1, y + 1, z + 1), put(x + 1, y + 1, z)],
        block, 40,
        put(x + 1, y + 1, z), put(x + 1, y + 1, z + 1), put(x + 1, y, z), 0.4,
      );
    }
  }, [cubes, grid, size, textureTick]);

  return (
    <div className="iso-wrap">
      <canvas ref={canvasRef} className="viewer-canvas structure-canvas" aria-label="Vista isométrica" />
      <p className="muted">
        Vista isométrica de {cubes.length} bloques visibles. Solo se dibujan las caras que se ven desde la esquina.
      </p>
    </div>
  );
}
