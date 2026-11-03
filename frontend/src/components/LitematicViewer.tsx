import { useEffect, useMemo, useRef, useState, type MouseEvent, type WheelEvent } from "react";
import type { LitematicLayer, LitematicSummary } from "../api/litematic";
import { errorMessage } from "../api/client";
import { blockColor, blockLabel, isAir } from "../lib/litematicView";
import { MAX_ISOMETRIC_VOLUME, type VoxelGrid } from "../lib/isometric";
import { IsometricView } from "./IsometricView";
import { LayerRange } from "./LayerRange";
import { clipLayers, rotateGrid } from "../lib/isometric";
import { Voxel3DView } from "./Voxel3DView";
import { SliceView } from "./SliceView";
import { gridFromVolume } from "../lib/volume";
import { LayerStepper } from "./LayerStepper";
import type { ViewerSource } from "./viewerSource";

interface Props {
  source: ViewerSource;
  title: string;
  /** Si no se pasa, el visor no muestra el botón de cerrar (por ejemplo, en la página de vista previa). */
  onClose?: () => void;
}

const MIN_CELL = 4;
const MAX_CELL = 60;

export function LitematicViewer({ source, title, onClose }: Props) {
  const [summary, setSummary] = useState<LitematicSummary | null>(null);
  const [regionName, setRegionName] = useState<string>("");
  const [y, setY] = useState(0);
  const [layer, setLayer] = useState<LitematicLayer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [mode, setMode] = useState<"layer" | "iso" | "slice" | "3d">("layer");
  const [texOn3d, setTexOn3d] = useState(true);
  const [gridOn, setGridOn] = useState(true);
  const [rangeFrom, setRangeFrom] = useState(0);
  const [rangeTo, setRangeTo] = useState<number | null>(null);
  const [turns, setTurns] = useState(0);
  const [isoGrid, setIsoGrid] = useState<VoxelGrid | null>(null);
  const [isoMessage, setIsoMessage] = useState<string | null>(null);
  const [cellSize, setCellSize] = useState(16);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    let active = true;
    source
      .summary()
      .then((data) => {
        if (!active) return;
        setSummary(data);
        setRegionName(data.regions[0]?.name ?? "");
      })
      .catch((err: unknown) => active && setError(errorMessage(err)));
    return () => {
      active = false;
    };
  }, [source]);

  const region = summary?.regions.find((r) => r.name === regionName);

  useEffect(() => {
    if (!regionName) return;
    let active = true;
    setError(null);
    source
      .layer(regionName, y)
      .then((data) => active && setLayer(data))
      .catch((err: unknown) => active && setError(errorMessage(err)));
    return () => {
      active = false;
    };
  }, [source, regionName, y]);

  // Recorte por rango para la vista 3D: se calcula solo cuando cambian el volumen o el rango.
  const clipped3d = useMemo(() => {
    if (!isoGrid) return null;
    const from = Math.min(rangeFrom, isoGrid.height - 1);
    const to = Math.min(rangeTo ?? isoGrid.height - 1, isoGrid.height - 1);
    return clipLayers(isoGrid, from, to);
  }, [isoGrid, rangeFrom, rangeTo]);

  // Vistas isométrica y de corte: una sola petición con el volumen completo de la región.
  useEffect(() => {
    if (mode === "layer" || !region) return;
    const volume = region.width * region.height * region.depth;
    if (volume > MAX_ISOMETRIC_VOLUME) {
      setIsoGrid(null);
      setIsoMessage(`La región tiene ${volume.toLocaleString("es-ES")} bloques; la vista isométrica admite hasta ${MAX_ISOMETRIC_VOLUME.toLocaleString("es-ES")}.`);
      return;
    }
    let active = true;
    setIsoMessage("Cargando volumen…");
    source
      .volume(regionName)
      .then((dto) => {
        if (!active) return;
        setIsoGrid(gridFromVolume(dto));
        setIsoMessage(null);
      })
      .catch((err: unknown) => active && setIsoMessage(errorMessage(err)));
    return () => {
      active = false;
    };
  }, [mode, source, regionName, region]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !layer || mode !== "layer") return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.fillStyle = "#1b1e1a";
    ctx.fillRect(0, 0, width, height);
    const gap = gridOn ? 1 : 0;

    // Cuadrícula de bloques: x a la derecha, z hacia abajo (vista desde arriba).
    for (let z = 0; z < layer.depth; z++) {
      for (let x = 0; x < layer.width; x++) {
        const block = layer.palette[layer.cells[z * layer.width + x]];
        if (isAir(block)) continue;
        ctx.fillStyle = blockColor(block);
        ctx.fillRect(offset.x + x * cellSize, offset.y + z * cellSize, cellSize - gap, cellSize - gap);
      }
    }

    if (selected) {
      // Borde del bloque seleccionado (se redibuja con el color del resaltado).
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      const [sx, sz] = selected.split(",").map(Number);
      ctx.strokeRect(offset.x + sx * cellSize, offset.y + sz * cellSize, cellSize - gap, cellSize - gap);
    }
  }, [layer, cellSize, offset, selected, mode, gridOn]);

  function cellAt(event: MouseEvent<HTMLCanvasElement>): { x: number; z: number } | null {
    const canvas = canvasRef.current;
    if (!canvas || !layer) return null;
    const rect = canvas.getBoundingClientRect();
    const px = ((event.clientX - rect.left) * canvas.width) / rect.width;
    const py = ((event.clientY - rect.top) * canvas.height) / rect.height;
    const x = Math.floor((px - offset.x) / cellSize);
    const z = Math.floor((py - offset.y) / cellSize);
    if (x < 0 || z < 0 || x >= layer.width || z >= layer.depth) return null;
    return { x, z };
  }

  function handleClick(event: MouseEvent<HTMLCanvasElement>) {
    const cell = cellAt(event);
    setSelected(cell ? `${cell.x},${cell.z}` : null);
  }

  function handleWheel(event: WheelEvent<HTMLCanvasElement>) {
    setCellSize((size) => Math.min(MAX_CELL, Math.max(MIN_CELL, size + (event.deltaY < 0 ? 2 : -2))));
  }

  function handleMouseDown(event: MouseEvent<HTMLCanvasElement>) {
    dragRef.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
  }

  function handleMouseMove(event: MouseEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    setOffset({ x: drag.ox + (event.clientX - drag.x), y: drag.oy + (event.clientY - drag.y) });
  }

  function endDrag() {
    dragRef.current = null;
  }

  const selectedBlock = selected && layer
    ? layer.palette[layer.cells[Number(selected.split(",")[1]) * layer.width + Number(selected.split(",")[0])]]
    : null;

  return (
    <section className="viewer" aria-label={`Visor de ${title}`}>
      <div className="page-heading">
        <h3>Visor de {title}</h3>
        {onClose && <button type="button" className="button" onClick={onClose}>Cerrar visor</button>}
      </div>

      {error && <p className="error" role="alert">{error}</p>}
      {!summary && !error && <p className="muted">Cargando archivo…</p>}

      {summary && region && (
        <>
          <div className="viewer-controls">
            <label>
              Región
              <select value={regionName} onChange={(e) => { setRegionName(e.target.value); setY(0); setSelected(null); }}>
                {summary.regions.map((r) => (
                  <option key={r.name} value={r.name}>{r.name}</option>
                ))}
              </select>
            </label>
            <label>
              Vista
              <select value={mode} onChange={(e) => setMode(e.target.value as "layer" | "iso" | "slice" | "3d")}>
                <option value="layer">Capa 2D</option>
                <option value="iso">Isométrica</option>
                <option value="slice">Corte lateral</option>
                <option value="3d">3D giratoria</option>
              </select>
            </label>
            {mode === "layer" && (
              <>
                <LayerStepper value={y} max={region.height - 1} onChange={setY} />
                <label>
                  Zoom
                  <input type="range" min={MIN_CELL} max={MAX_CELL} value={cellSize} onChange={(e) => setCellSize(Number(e.target.value))} />
                </label>
                <button type="button" className="button" onClick={() => setOffset({ x: 0, y: 0 })}>Centrar</button>
                <label className="checkbox">
                  <input type="checkbox" checked={gridOn} onChange={(e) => setGridOn(e.target.checked)} />
                  Rejilla
                </label>
              </>
            )}
          </div>

          {mode === "iso" && isoGrid && (
            <>
              <LayerRange
                max={isoGrid.height - 1}
                from={Math.min(rangeFrom, isoGrid.height - 1)}
                to={Math.min(rangeTo ?? isoGrid.height - 1, isoGrid.height - 1)}
                onChange={(f, t) => { setRangeFrom(f); setRangeTo(t); }}
              />
              <div className="rotate-bar">
                <button type="button" className="button" onClick={() => setTurns((t) => t - 1)} aria-label="Girar a la izquierda">↺</button>
                <button type="button" className="button" onClick={() => setTurns((t) => t + 1)} aria-label="Girar a la derecha">↻</button>
                <span className="muted small">Vista {((turns % 4) + 4) % 4 * 90}°</span>
              </div>
              <IsometricView grid={rotateGrid(clipLayers(isoGrid, Math.min(rangeFrom, isoGrid.height - 1), Math.min(rangeTo ?? isoGrid.height - 1, isoGrid.height - 1)), turns)} />
            </>
          )}
          {mode === "iso" && !isoGrid && <p className="muted">{isoMessage}</p>}
          {mode === "slice" && (isoGrid ? <SliceView grid={isoGrid} /> : <p className="muted">{isoMessage}</p>)}
          {mode === "3d" && isoGrid && (
            <>
              <label className="checkbox">
                <input type="checkbox" checked={texOn3d} onChange={(e) => setTexOn3d(e.target.checked)} />
                Texturas (más lento)
              </label>
              <LayerRange
                max={isoGrid.height - 1}
                from={Math.min(rangeFrom, isoGrid.height - 1)}
                to={Math.min(rangeTo ?? isoGrid.height - 1, isoGrid.height - 1)}
                onChange={(f, t) => { setRangeFrom(f); setRangeTo(t); }}
              />
              <Voxel3DView grid={clipped3d!} useTextures={texOn3d} />
            </>
          )}

          {mode === "layer" && <canvas
            ref={canvasRef}
            className="viewer-canvas"
            width={900}
            height={520}
            onClick={handleClick}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={endDrag}
            onMouseLeave={endDrag}
          />}

          <p className="muted">
            Arrastra para desplazar, rueda para hacer zoom, clic para ver un bloque.
            {" "}Dimensiones de la región: {region.width} × {region.height} × {region.depth} (coordenadas locales).
          </p>
          <p aria-live="polite">
            {!selectedBlock && "Ningún bloque seleccionado."}
            {selectedBlock && isAir(selectedBlock) && "Esta celda está vacía (aire)."}
            {selectedBlock && !isAir(selectedBlock) && (
              <>Bloque: <strong>{blockLabel(selectedBlock)}</strong> <span className="muted">({selectedBlock})</span></>
            )}
          </p>

          <h4>Materiales (total del archivo, sin aire)</h4>
          <table className="farm-table">
            <thead>
              <tr>
                <th>Bloque</th>
                <th>Cantidad</th>
                <th>Stacks</th>
              </tr>
            </thead>
            <tbody>
              {summary.blockCounts.slice(0, 20).map((b) => (
                <tr key={b.block}>
                  <td>{blockLabel(b.block)}</td>
                  <td>{b.count}</td>
                  <td>{b.stacks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
