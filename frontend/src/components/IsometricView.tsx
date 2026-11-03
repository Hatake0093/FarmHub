import { useEffect, useMemo, useRef } from "react";
import { project, shade, visibleCubes, type VoxelGrid } from "../lib/isometric";

interface Props {
  grid: VoxelGrid;
}

const MAX_WIDTH = 880;
const PADDING = 12;

/** Vista isométrica estática de una rejilla. Las caras se pintan de más lejanas a más cercanas. */
export function IsometricView({ grid }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const cubes = useMemo(() => visibleCubes(grid), [grid]);

  const size = useMemo(() => {
    // Tamaño de cubo que hace caber la figura en el ancho disponible.
    const span = grid.width + grid.depth;
    return Math.max(2, Math.min(24, Math.floor(MAX_WIDTH / span)));
  }, [grid]);

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

    const face = (points: [number, number][], fill: string) => {
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
    };

    for (const cube of cubes) {
      const { x, y, z, block } = cube;
      // Cara superior (+Y)
      face([put(x, y + 1, z), put(x + 1, y + 1, z), put(x + 1, y + 1, z + 1), put(x, y + 1, z + 1)], shade(block, 68));
      // Cara +Z (izquierda en pantalla)
      face([put(x, y, z + 1), put(x + 1, y, z + 1), put(x + 1, y + 1, z + 1), put(x, y + 1, z + 1)], shade(block, 52));
      // Cara +X (derecha en pantalla)
      face([put(x + 1, y, z), put(x + 1, y, z + 1), put(x + 1, y + 1, z + 1), put(x + 1, y + 1, z)], shade(block, 40));
    }
  }, [cubes, grid, size]);

  return (
    <div className="iso-wrap">
      <canvas ref={canvasRef} className="viewer-canvas structure-canvas" aria-label="Vista isométrica" />
      <p className="muted">
        Vista isométrica de {cubes.length} bloques visibles. Solo se dibujan las caras que se ven desde la esquina.
      </p>
    </div>
  );
}
