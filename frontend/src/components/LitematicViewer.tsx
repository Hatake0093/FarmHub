import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
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
/** Píxeles que hay que mover el puntero para que un clic cuente como arrastre. */
const DRAG_THRESHOLD = 4;
const MATERIALS_SHOWN = 20;

const VIEW_MODES: { value: "layer" | "iso" | "slice" | "3d"; label: string }[] = [
  { value: "layer", label: "Capa 2D" },
  { value: "iso", label: "Isométrica" },
  { value: "slice", label: "Corte lateral" },
  { value: "3d", label: "3D" },
];

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
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number; moved: boolean } | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  // Al abrirse dentro de una página larga (un diseño), lleva el visor a la vista; en la vista previa ya ocupa la página.
  useEffect(() => {
    if (onClose) sectionRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [onClose]);

  // Escape cierra el visor.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.fullscreenElement) onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // La rueda hace zoom sin desplazar la página: necesita un listener no pasivo.
  const showingLayer = mode === "layer" && !!summary;
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !showingLayer) return;
    const onWheel = (event: globalThis.WheelEvent) => {
      event.preventDefault();
      setCellSize((size) => Math.min(MAX_CELL, Math.max(MIN_CELL, size + (event.deltaY < 0 ? 2 : -2))));
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [showingLayer]);

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

  function cellAt(event: PointerEvent<HTMLCanvasElement>): { x: number; z: number } | null {
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

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y, moved: false };
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    const canvas = canvasRef.current;
    if (!drag || !canvas) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    drag.moved = true;
    // El lienzo se muestra escalado: convierte píxeles de pantalla a píxeles del lienzo para que siga al cursor.
    const scale = canvas.width / canvas.getBoundingClientRect().width;
    setOffset({ x: drag.ox + dx * scale, y: drag.oy + dy * scale });
  }

  function handlePointerUp(event: PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    dragRef.current = null;
    // Un toque o clic sin arrastre selecciona el bloque; un arrastre no.
    if (drag && !drag.moved) {
      const cell = cellAt(event);
      setSelected(cell ? `${cell.x},${cell.z}` : null);
    }
  }

  const selectedBlock = selected && layer
    ? layer.palette[layer.cells[Number(selected.split(",")[1]) * layer.width + Number(selected.split(",")[0])]]
    : null;

  return (
    <section className="viewer" aria-label={`Visor de ${title}`} ref={sectionRef}>
      <div className="page-heading">
        <h3>Visor de {title}</h3>
        {onClose && <button type="button" className="button" onClick={onClose} title="Escape">Cerrar visor</button>}
      </div>

      {error && <p className="alert" role="alert">{error}</p>}
      {!summary && !error && <p className="muted" role="status">Cargando archivo…</p>}

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
            <div className="view-tabs" role="group" aria-label="Vista">
              {VIEW_MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  className={`button${mode === m.value ? " button-primary" : ""}`}
                  aria-pressed={mode === m.value}
                  onClick={() => setMode(m.value)}
                >
                  {m.label}
                </button>
              ))}
            </div>
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
          {mode === "iso" && !isoGrid && <p className="muted" role="status">{isoMessage}</p>}
          {mode === "slice" && (isoGrid ? <SliceView grid={isoGrid} /> : <p className="muted" role="status">{isoMessage}</p>)}
          {mode === "3d" && !isoGrid && <p className="muted" role="status">{isoMessage}</p>}
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
            aria-label="Capa del archivo"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={() => { dragRef.current = null; }}
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
              {summary.blockCounts.slice(0, MATERIALS_SHOWN).map((b) => (
                <tr key={b.block}>
                  <td>{blockLabel(b.block)}</td>
                  <td>{b.count}</td>
                  <td>{b.stacks}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {summary.blockCounts.length > MATERIALS_SHOWN && (
            <p className="muted small">
              Se muestran los {MATERIALS_SHOWN} más abundantes de {summary.blockCounts.length} tipos de bloque.
            </p>
          )}
        </>
      )}
    </section>
  );
}
