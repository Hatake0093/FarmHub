import { useEffect, useRef } from "react";
import { blockColor, isAir } from "../lib/litematicView";
import type { VoxelGrid } from "../lib/isometric";

interface Props {
  grid: VoxelGrid;
  onPickLayer: (y: number) => void;
}

/** Todas las capas a la vez, como mosaico. Pulsar una capa abre la vista 2D en esa altura. */
export function StackView({ grid, onPickLayer }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const perRow = Math.max(1, Math.ceil(Math.sqrt(grid.height)));
  const rows = Math.ceil(grid.height / perRow);
  const tile = Math.max(2, Math.min(8, Math.floor(880 / (perRow * (grid.width + 2)))));
  const tileW = grid.width * tile;
  const tileH = grid.depth * tile;
  const gap = 18;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.width = perRow * (tileW + gap) + gap;
    canvas.height = rows * (tileH + gap + 14) + gap;
    ctx.fillStyle = "#1b1e1a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = "12px system-ui, sans-serif";
    for (let y = 0; y < grid.height; y++) {
      const ox = gap + (y % perRow) * (tileW + gap);
      const oy = gap + Math.floor(y / perRow) * (tileH + gap + 14);
      ctx.fillStyle = "#c8ccc4";
      ctx.fillText(`Y ${y}`, ox, oy + 10);
      const top = oy + 14;
      for (let z = 0; z < grid.depth; z++) {
        for (let x = 0; x < grid.width; x++) {
          const block = grid.palette[grid.blocks[(y * grid.depth + z) * grid.width + x]];
          if (isAir(block)) continue;
          ctx.fillStyle = blockColor(block);
          ctx.fillRect(ox + x * tile, top + z * tile, tile - 1, tile - 1);
        }
      }
    }
  }, [grid, perRow, rows, tileW, tileH, tile]);

  function pick(event: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = ((event.clientX - rect.left) * canvas.width) / rect.width;
    const py = ((event.clientY - rect.top) * canvas.height) / rect.height;
    const col = Math.floor((px - gap) / (tileW + gap));
    const row = Math.floor((py - gap) / (tileH + gap + 14));
    const y = row * perRow + col;
    if (col >= 0 && col < perRow && row >= 0 && y < grid.height) onPickLayer(y);
  }

  return (
    <div className="stack-view">
      <p className="muted small">Todas las capas a la vez. Pulsa una capa para editarla en 2D.</p>
      <div className="grid-scroll">
        <canvas ref={canvasRef} className="structure-canvas" aria-label="Capas apiladas" onClick={pick} />
      </div>
    </div>
  );
}
