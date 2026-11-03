import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { blockColor, blockLabel, isAir } from "../lib/litematicView";
import { sliceGrid, sliceRange, type SliceAxis } from "../lib/slice";
import type { VoxelGrid } from "../lib/isometric";

interface Props {
  grid: VoxelGrid;
  /** Coordenada del mundo de la celda (0,0,0), si la estructura la tiene. */
  base?: { x: number; y: number; z: number };
}

const MAX_WIDTH = 900;

/** Corte lateral de un volumen: elige el eje, mueve el plano y mira la sección. */
export function SliceView({ grid, base }: Props) {
  const [axis, setAxis] = useState<SliceAxis>("z");
  const [index, setIndex] = useState(0);
  const [hover, setHover] = useState<{ col: number; row: number } | null>(null);
  const [gridOn, setGridOn] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const range = sliceRange(grid, axis);
  const current = Math.min(index, range - 1);
  const slice = useMemo(() => sliceGrid(grid, axis, current), [grid, axis, current]);
  const cell = Math.max(4, Math.min(40, Math.floor(MAX_WIDTH / slice.cols)));

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.width = slice.cols * cell;
    canvas.height = slice.rows * cell;
    ctx.fillStyle = "#1b1e1a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const gap = gridOn ? 1 : 0;
    for (let row = 0; row < slice.rows; row++) {
      for (let col = 0; col < slice.cols; col++) {
        const block = slice.palette[slice.cells[row * slice.cols + col]];
        if (isAir(block)) continue;
        ctx.fillStyle = blockColor(block);
        ctx.fillRect(col * cell, row * cell, cell - gap, cell - gap);
      }
    }
    if (hover) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.strokeRect(hover.col * cell, hover.row * cell, cell - gap, cell - gap);
    }
  }, [slice, cell, hover, gridOn]);

  function cellAt(event: MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const col = Math.floor(((event.clientX - rect.left) * canvas.width) / rect.width / cell);
    const row = Math.floor(((event.clientY - rect.top) * canvas.height) / rect.height / cell);
    if (col < 0 || row < 0 || col >= slice.cols || row >= slice.rows) return null;
    return { col, row };
  }

  // Coordenadas locales de la celda bajo el ratón.
  const local = hover
    ? axis === "z"
      ? { x: hover.col, y: slice.rows - 1 - hover.row, z: current }
      : { x: current, y: slice.rows - 1 - hover.row, z: hover.col }
    : null;
  const block = hover ? slice.palette[slice.cells[hover.row * slice.cols + hover.col]] : null;

  return (
    <div className="slice-view">
      <div className="viewer-controls">
        <label>
          Eje del corte
          <select value={axis} onChange={(e) => { setAxis(e.target.value as SliceAxis); setIndex(0); }}>
            <option value="z">Lateral (plano Z fijo)</option>
            <option value="x">Frontal (plano X fijo)</option>
          </select>
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={gridOn} onChange={(e) => setGridOn(e.target.checked)} />
          Rejilla
        </label>
        <label>
          Corte {axis.toUpperCase()}: {current} / {range - 1}
          <input type="range" min={0} max={range - 1} value={current} onChange={(e) => setIndex(Number(e.target.value))} />
        </label>
      </div>

      <div className="grid-scroll">
        <canvas
          ref={canvasRef}
          className="structure-canvas"
          aria-label="Corte lateral"
          onMouseMove={(e) => setHover(cellAt(e))}
          onMouseLeave={() => setHover(null)}
        />
      </div>

      <div className="coord-panel" aria-live="polite">
        {local && block ? (
          <>
            <p>
              Local: <strong>X {local.x} · Y {local.y} · Z {local.z}</strong>
              {base && (
                <span className="muted">
                  {" "}· Mundo: X {base.x + local.x} · Y {base.y + local.y} · Z {base.z + local.z}
                </span>
              )}
            </p>
            <p>Bloque: {isAir(block) ? <em>vacío (aire)</em> : <strong>{blockLabel(block)}</strong>}</p>
          </>
        ) : (
          <p className="muted">Pasa el ratón por el corte para ver las coordenadas.</p>
        )}
      </div>
    </div>
  );
}
