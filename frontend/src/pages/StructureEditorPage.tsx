import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { structuresApi, type StructureDetail, type StructureLayer } from "../api/structures";
import { blocksApi, type BlockEntry } from "../api/blocks";
import { errorMessage } from "../api/client";
import { blockColor, blockLabel, isAir } from "../lib/litematicView";
import { MAX_ISOMETRIC_VOLUME, type VoxelGrid } from "../lib/isometric";
import { IsometricView } from "../components/IsometricView";
import { LayerRange } from "../components/LayerRange";
import { normalizeBox, planCopy, planCopyLayer, planMove, type Box, type Delta } from "../lib/selection";
import { clipLayers, rotateGrid } from "../lib/isometric";
import { SliceView } from "../components/SliceView";
import { gridFromVolume } from "../lib/volume";
import { LayerStepper } from "../components/LayerStepper";
import { BlockPicker } from "../components/BlockPicker";
import {
  displayedBlock,
  toPatchChanges,
  withChange,
  worldCoordinates,
  type Coordinates,
  type PendingChanges,
} from "../lib/structureEdit";

const BLOCK_ID = /^[a-z0-9_.-]+:[a-z0-9/_.-]+$/;

export function StructureEditorPage() {
  const { id } = useParams();
  const structureId = Number(id);

  const [detail, setDetail] = useState<StructureDetail | null>(null);
  const [layer, setLayer] = useState<StructureLayer | null>(null);
  const [y, setY] = useState(0);
  const [block, setBlock] = useState("minecraft:stone");
  const [erase, setErase] = useState(false);
  const [pending, setPending] = useState<PendingChanges>(new Map());
  const [hover, setHover] = useState<Coordinates | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"layer" | "iso" | "slice">("layer");
  const [gridOn, setGridOn] = useState(true);
  // Selección rectangular en la capa actual (X/Z) con rango de Y, y desplazamiento pendiente.
  const [sel, setSel] = useState<{ ax: number; az: number; bx: number; bz: number; y0: number; y1: number } | null>(null);
  const [offset, setOffset] = useState<Delta>({ dx: 0, dy: 0, dz: 0 });
  const selAnchorRef = useRef<{ x: number; z: number } | null>(null);
  const [copyTarget, setCopyTarget] = useState("");
  const [copyKeepAir, setCopyKeepAir] = useState(false);
  const [rangeFrom, setRangeFrom] = useState(0);
  const [rangeTo, setRangeTo] = useState<number | null>(null);
  const [turns, setTurns] = useState(0);
  const [catalog, setCatalog] = useState<BlockEntry[]>([]);
  const [isoGrid, setIsoGrid] = useState<VoxelGrid | null>(null);
  const [isoMessage, setIsoMessage] = useState<string | null>(null);
  const [base, setBase] = useState({ x: "0", y: "0", z: "0" });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Qué hace el arrastre actual: pintar (botón izquierdo) o borrar (botón derecho).
  const paintingRef = useRef<"paint" | "erase" | "select" | null>(null);
  // Capa fantasma: la capa inferior o superior se dibuja semitransparente detrás de la actual.
  const [ghost, setGhost] = useState<"none" | "below" | "above">("none");
  const [ghostLayer, setGhostLayer] = useState<StructureLayer | null>(null);

  // Tamaño de celda según el ancho de la ventana: la rejilla crece con la pantalla.
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const cell = useMemo(() => {
    if (!detail) return 16;
    const available = Math.max(320, viewportWidth - 120);
    return Math.max(8, Math.min(40, Math.floor(available / detail.width)));
  }, [detail, viewportWidth]);

  useEffect(() => {
    blocksApi.list().then(setCatalog).catch(() => setCatalog([]));
  }, []);

  useEffect(() => {
    structuresApi
      .get(structureId)
      .then((d) => {
        setDetail(d);
        setBase({ x: String(d.baseX), y: String(d.baseY), z: String(d.baseZ) });
      })
      .catch((err: unknown) => setError(errorMessage(err)));
  }, [structureId]);

  useEffect(() => {
    if (!detail) return;
    let active = true;
    structuresApi
      .layer(structureId, y)
      .then((l) => active && setLayer(l))
      .catch((err: unknown) => active && setError(errorMessage(err)));
    return () => {
      active = false;
    };
  }, [detail, structureId, y]);

  // Vistas isométrica y de corte: lo guardado en el servidor, en una sola petición.
  useEffect(() => {
    if (mode === "layer" || !detail) return;
    const volume = detail.width * detail.height * detail.depth;
    if (volume > MAX_ISOMETRIC_VOLUME) {
      setIsoGrid(null);
      setIsoMessage(`El esquemático tiene ${volume.toLocaleString("es-ES")} bloques; la vista isométrica admite hasta ${MAX_ISOMETRIC_VOLUME.toLocaleString("es-ES")}.`);
      return;
    }
    let active = true;
    setIsoMessage("Cargando volumen…");
    structuresApi
      .volume(structureId)
      .then((dto) => {
        if (!active) return;
        setIsoGrid(gridFromVolume(dto));
        setIsoMessage(null);
      })
      .catch((err: unknown) => active && setIsoMessage(errorMessage(err)));
    return () => {
      active = false;
    };
  }, [mode, detail, structureId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !layer || !detail || mode !== "layer") return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = layer.width * cell;
    canvas.height = layer.depth * cell;
    ctx.fillStyle = "#1b1e1a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const gap = gridOn ? 1 : 0;

    // Capa fantasma: semitransparente, detrás de la capa actual.
    if (ghostLayer && ghostLayer.width === layer.width && ghostLayer.depth === layer.depth) {
      ctx.globalAlpha = 0.3;
      for (let z = 0; z < ghostLayer.depth; z++) {
        for (let x = 0; x < ghostLayer.width; x++) {
          const block = ghostLayer.palette[ghostLayer.cells[z * ghostLayer.width + x]];
          if (isAir(block)) continue;
          ctx.fillStyle = blockColor(block);
          ctx.fillRect(x * cell, z * cell, cell - gap, cell - gap);
        }
      }
      ctx.globalAlpha = 1;
    }

    for (let z = 0; z < layer.depth; z++) {
      for (let x = 0; x < layer.width; x++) {
        const serverBlock = layer.palette[layer.cells[z * layer.width + x]];
        const shown = displayedBlock(pending, { x, y, z }, serverBlock);
        if (isAir(shown)) continue;
        ctx.fillStyle = blockColor(shown);
        ctx.fillRect(x * cell, z * cell, cell - gap, cell - gap);
      }
    }

    // Selección: contorno de la caja original (blanco) y del destino (amarillo) en la capa actual.
    if (selBox) {
      const drawBox = (b: Box, color: string) => {
        if (y < b.y0 || y > b.y1) return;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(b.x0 * cell, b.z0 * cell, (b.x1 - b.x0 + 1) * cell, (b.z1 - b.z0 + 1) * cell);
        ctx.setLineDash([]);
      };
      drawBox(selBox, "#ffffff");
      drawBox({ x0: selBox.x0 + offset.dx, x1: selBox.x1 + offset.dx, y0: selBox.y0 + offset.dy, y1: selBox.y1 + offset.dy, z0: selBox.z0 + offset.dz, z1: selBox.z1 + offset.dz }, "#e0c040");
    }

    if (hover && hover.y === y) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.strokeRect(hover.x * cell, hover.z * cell, cell - gap, cell - gap);
    }
  }, [layer, pending, hover, y, cell, detail, mode, ghostLayer, gridOn, sel, offset]);

  function localAt(event: MouseEvent<HTMLCanvasElement>): Coordinates | null {
    const canvas = canvasRef.current;
    if (!canvas || !layer) return null;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((event.clientX - rect.left) * canvas.width) / rect.width / cell);
    const z = Math.floor(((event.clientY - rect.top) * canvas.height) / rect.height / cell);
    if (x < 0 || z < 0 || x >= layer.width || z >= layer.depth) return null;
    return { x, y, z };
  }

  function paint(local: Coordinates, asErase: boolean) {
    if (!layer) return;
    const target = asErase || erase ? null : block.trim();
    if (target !== null && !BLOCK_ID.test(target)) {
      setError(`"${target}" no es un identificador de bloque válido (p. ej. minecraft:stone).`);
      return;
    }
    setPending((current) => withChange(current, local, target));
  }

  function handleDown(event: MouseEvent<HTMLCanvasElement>) {
    const local = localAt(event);
    if (!local) return;
    // Mayús + botón izquierdo: empieza a seleccionar un rectángulo en la capa actual.
    if (event.button === 0 && event.shiftKey) {
      selAnchorRef.current = { x: local.x, z: local.z };
      setSel({ ax: local.x, az: local.z, bx: local.x, bz: local.z, y0: local.y, y1: local.y });
      setOffset({ dx: 0, dy: 0, dz: 0 });
      paintingRef.current = "select";
      return;
    }
    // Botón central: cuentagotas. Toma el bloque de esa celda (con los cambios pendientes).
    if (event.button === 1 && layer) {
      event.preventDefault();
      const serverBlock = layer.palette[layer.cells[local.z * layer.width + local.x]];
      const picked = displayedBlock(pending, local, serverBlock);
      if (isAir(picked)) {
        setErase(true);
      } else {
        setBlock(picked);
        setErase(false);
      }
      return;
    }
    // Botón derecho: borra. Botón izquierdo: pinta.
    const action = event.button === 2 ? "erase" : "paint";
    paintingRef.current = action;
    setHover(local);
    paint(local, action === "erase");
  }

  function handleMove(event: MouseEvent<HTMLCanvasElement>) {
    const local = localAt(event);
    setHover(local);
    if (local && paintingRef.current === "select") {
      setSel((current) => (current ? { ...current, bx: local.x, bz: local.z } : current));
      return;
    }
    if (local && paintingRef.current) paint(local, paintingRef.current === "erase");
  }

  function stopPainting() {
    paintingRef.current = null;
  }

  const selBox: Box | null = sel
    ? normalizeBox({ x: sel.ax, z: sel.az }, { x: sel.bx, z: sel.bz }, sel.y0, sel.y1)
    : null;

  function clearSelection() {
    setSel(null);
    setOffset({ dx: 0, dy: 0, dz: 0 });
  }

  async function applySelection() {
    if (!selBox || !detail) return;
    const moved = offset.dx !== 0 || offset.dy !== 0 || offset.dz !== 0;
    if (!moved) {
      clearSelection();
      return;
    }
    if (pending.size > 0) {
      setError("Guarda los cambios antes de mover la selección.");
      return;
    }
    setError(null);
    try {
      const grid = gridFromVolume(await structuresApi.volume(structureId));
      const changes = planMove(grid, selBox, offset);
      if (changes === null) {
        setError("El destino queda fuera de la estructura.");
        return;
      }
      if (changes.length > 100_000) {
        setError("La selección es demasiado grande para mover de una vez.");
        return;
      }
      const updated = changes.length > 0 ? await structuresApi.saveBlocks(structureId, changes) : detail;
      setDetail(updated);
      setMessage(`Selección movida (${changes.length} celdas).`);
      clearSelection();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  // Copia la selección al desplazamiento indicado; el original no cambia.
  async function copySelection() {
    if (!selBox || !detail) return;
    if (offset.dx === 0 && offset.dy === 0 && offset.dz === 0) {
      setError("Mueve la copia con las flechas o RePág/AvPág antes de copiar.");
      return;
    }
    if (pending.size > 0) {
      setError("Guarda los cambios antes de copiar la selección.");
      return;
    }
    setError(null);
    try {
      const grid = gridFromVolume(await structuresApi.volume(structureId));
      const changes = planCopy(grid, selBox, offset, copyKeepAir);
      if (changes === null) {
        setError("La copia queda fuera de la estructura.");
        return;
      }
      if (changes.length > 100_000) {
        setError("La selección es demasiado grande para copiar de una vez.");
        return;
      }
      const updated = changes.length > 0 ? await structuresApi.saveBlocks(structureId, changes) : detail;
      setDetail(updated);
      setMessage(`Selección copiada (${changes.length} celdas cambiadas).`);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  // Copia la capa actual sobre otra capa. Exige guardar antes, igual que mover.
  async function cloneLayer() {
    if (!detail) return;
    const target = Number(copyTarget);
    if (!Number.isInteger(target) || target < 0 || target >= detail.height) {
      setError(`Indica una capa entre 0 y ${detail.height - 1}.`);
      return;
    }
    if (target === y) {
      setError("La capa destino es la misma que la origen.");
      return;
    }
    if (pending.size > 0) {
      setError("Guarda los cambios antes de clonar la capa.");
      return;
    }
    setError(null);
    try {
      const grid = gridFromVolume(await structuresApi.volume(structureId));
      const changes = planCopyLayer(grid, y, target, copyKeepAir);
      if (changes === null) {
        setError("No se pudo copiar la capa.");
        return;
      }
      const updated = changes.length > 0 ? await structuresApi.saveBlocks(structureId, changes) : detail;
      setDetail(updated);
      setMessage(`Capa ${y} copiada a la ${target} (${changes.length} celdas cambiadas).`);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  // Teclado mientras hay selección: flechas mueven en X/Z, RePág/AvPág en Y, Enter aplica, Escape cancela.
  useEffect(() => {
    if (!sel) return;
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, select")) return;
      const keys: Record<string, Partial<Delta>> = {
        ArrowLeft: { dx: -1 }, ArrowRight: { dx: 1 }, ArrowUp: { dz: -1 }, ArrowDown: { dz: 1 },
        PageUp: { dy: 1 }, PageDown: { dy: -1 },
      };
      if (event.key in keys) {
        event.preventDefault();
        const step = keys[event.key];
        setOffset((o) => ({ dx: o.dx + (step.dx ?? 0), dy: o.dy + (step.dy ?? 0), dz: o.dz + (step.dz ?? 0) }));
      } else if (event.key === "Enter") {
        event.preventDefault();
        void applySelection();
      } else if (event.key === "Escape") {
        clearSelection();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, offset, pending]);

  // Carga la capa fantasma (inferior o superior) cuando está activa.
  useEffect(() => {
    if (ghost === "none" || !detail) {
      setGhostLayer(null);
      return;
    }
    const target = ghost === "below" ? y - 1 : y + 1;
    if (target < 0 || target >= detail.height) {
      setGhostLayer(null);
      return;
    }
    let active = true;
    structuresApi
      .layer(structureId, target)
      .then((l) => active && setGhostLayer(l))
      .catch(() => active && setGhostLayer(null));
    return () => {
      active = false;
    };
  }, [ghost, y, detail, structureId]);

  const hoverBlock = hover && layer
    ? displayedBlock(pending, hover, layer.palette[layer.cells[hover.z * layer.width + hover.x]])
    : null;

  async function handleSave() {
    if (pending.size === 0) return;
    const changes = toPatchChanges(pending);
    setSaving(true);
    setError(null);
    try {
      const updated = await structuresApi.saveBlocks(structureId, changes);
      setDetail(updated);
      setPending(new Map());
      setMessage(`${changes.length} cambios guardados.`);
      setLayer(await structuresApi.layer(structureId, y));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const [size, setSize] = useState({ w: "", h: "", d: "" });

  async function handleResize() {
    if (!detail) return;
    const w = Number(size.w || detail.width);
    const h = Number(size.h || detail.height);
    const d = Number(size.d || detail.depth);
    if (w === detail.width && h === detail.height && d === detail.depth) return;
    setError(null);
    setMessage(null);
    try {
      let updated: StructureDetail;
      try {
        updated = await structuresApi.resize(structureId, w, h, d, false);
      } catch (err) {
        // 409: el cambio borraría bloques. Se pide confirmación antes de repetirlo.
        const message = errorMessage(err);
        if (!window.confirm(`${message}\n\n¿Continuar?`)) return;
        updated = await structuresApi.resize(structureId, w, h, d, true);
      }
      setDetail(updated);
      setSize({ w: "", h: "", d: "" });
      setY((current) => Math.min(current, updated.height - 1));
      setPending(new Map());
      setMessage("Tamaño cambiado.");
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function handleSaveBase() {
    if (!detail) return;
    setError(null);
    try {
      const updated = await structuresApi.updateMeta(structureId, {
        name: detail.name,
        description: detail.description,
        baseX: Number(base.x),
        baseY: Number(base.y),
        baseZ: Number(base.z),
      });
      setDetail(updated);
      setMessage("Coordenada base guardada.");
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (error && !detail) return <p className="error" role="alert">{error}</p>;
  if (!detail || !layer) return <p className="muted">Cargando esquemático…</p>;

  const baseCoords = { x: detail.baseX, y: detail.baseY, z: detail.baseZ };
  const world = hover ? worldCoordinates(baseCoords, hover) : null;

  return (
    <section>
      <div className="page-heading">
        <div>
          <p className="muted"><Link to="/structures">Esquemáticos</Link> / {detail.name}</p>
          <h1>{detail.name}</h1>
        </div>
        <span className="muted">{detail.blockCount} bloques · {detail.width} × {detail.height} × {detail.depth}</span>
      </div>

      <div className="viewer-controls">
        <label>
          Vista
          <select value={mode} onChange={(e) => setMode(e.target.value as "layer" | "iso" | "slice")}>
            <option value="layer">Capa 2D (editable)</option>
            <option value="iso">Isométrica (guardado)</option>
            <option value="slice">Corte lateral (guardado)</option>
          </select>
        </label>
        {mode === "layer" && (
        <label>
          Capa fantasma
          <select value={ghost} onChange={(e) => setGhost(e.target.value as "none" | "below" | "above")}>
            <option value="none">Ninguna</option>
            <option value="below">Capa inferior</option>
            <option value="above">Capa superior</option>
          </select>
        </label>
        )}
        {mode === "layer" && (
        <LayerStepper value={y} max={detail.height - 1} onChange={setY} />
        )}
        {mode === "layer" && (
        <BlockPicker catalog={catalog} value={block} onChange={(id) => { setBlock(id); setErase(false); }} />
        )}
        {mode === "layer" && (
        <label className="checkbox">
          <input type="checkbox" checked={erase} onChange={(e) => setErase(e.target.checked)} />
          Borrar (aire)
        </label>
        )}
        {mode === "layer" && (
        <label className="checkbox">
          <input type="checkbox" checked={gridOn} onChange={(e) => setGridOn(e.target.checked)} />
          Rejilla
        </label>
        )}
        {mode === "layer" && (
        <div className="clone-layer">
          <label>
            Clonar capa {y} a
            <input type="number" min={0} max={detail.height - 1} value={copyTarget} placeholder="capa" onChange={(e) => setCopyTarget(e.target.value)} />
          </label>
          <label className="checkbox">
            <input type="checkbox" checked={copyKeepAir} onChange={(e) => setCopyKeepAir(e.target.checked)} />
            Solo bloques (no borrar aire)
          </label>
          <button type="button" className="button" onClick={() => void cloneLayer()}>Clonar capa</button>
        </div>
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
      {mode === "slice" && (isoGrid ? <SliceView grid={isoGrid} base={{ x: detail.baseX, y: detail.baseY, z: detail.baseZ }} /> : <p className="muted">{isoMessage}</p>)}

      {mode === "layer" && (
        <div className="grid-scroll">
          <canvas
            ref={canvasRef}
            className="structure-canvas"
            onMouseDown={handleDown}
            onMouseMove={handleMove}
            onMouseUp={stopPainting}
            onAuxClick={(e) => e.preventDefault()}
            onContextMenu={(e) => e.preventDefault()}
            onMouseLeave={() => { stopPainting(); setHover(null); }}
          />
        </div>
      )}

      {mode === "layer" && selBox && detail && (
        <div className="selection-bar" role="region" aria-label="Selección">
          <span>
            Selección X {selBox.x0}–{selBox.x1} · Z {selBox.z0}–{selBox.z1} · Y{" "}
            <input type="number" min={0} max={detail.height - 1} value={sel?.y0 ?? 0} onChange={(e) => setSel((c) => (c ? { ...c, y0: Number(e.target.value) } : c))} />
            {" – "}
            <input type="number" min={0} max={detail.height - 1} value={sel?.y1 ?? 0} onChange={(e) => setSel((c) => (c ? { ...c, y1: Number(e.target.value) } : c))} />
            {" · desplazamiento X "}{offset.dx} Y {offset.dy} Z {offset.dz}
          </span>
          <span className="muted small">Flechas: X/Z · RePág/AvPág: Y · Enter: mover · Escape: cancelar · Copiar: deja el original</span>
          <div className="actions">
            <button type="button" className="button button-primary" onClick={() => void applySelection()}>Aplicar</button>
            <button type="button" className="button" onClick={() => void copySelection()}>Copiar</button>
            <button type="button" className="button" onClick={clearSelection}>Cancelar</button>
          </div>
        </div>
      )}
      <div className="coord-panel" aria-live="polite">
        {hover && world && hoverBlock ? (
          <>
            <p>
              Coordenada del mundo: <strong>X {world.x} · Y {world.y} · Z {world.z}</strong>
              <span className="muted"> (local {hover.x}, {hover.y}, {hover.z})</span>
            </p>
            <p>
              Bloque aquí: {isAir(hoverBlock) ? <em>vacío (aire)</em> : <strong>{blockLabel(hoverBlock)}</strong>}
            </p>
          </>
        ) : (
          <p className="muted">Pasa el ratón por la rejilla para ver la coordenada del mundo.</p>
        )}
      </div>

      <div className="actions">
        <button type="button" className="button button-primary" onClick={handleSave} disabled={saving || pending.size === 0}>
          {saving ? "Guardando…" : `Guardar cambios (${pending.size})`}
        </button>
        {pending.size > 0 && (
          <button type="button" className="button" onClick={() => setPending(new Map())}>Descartar cambios</button>
        )}
      </div>
      {message && <p className="muted" role="status">{message}</p>}
      {error && <p className="error" role="alert">{error}</p>}

      <fieldset className="base-form">
        <legend>Coordenada base del mundo (esquina mínima)</legend>
        <div className="dimension-grid">
          <label>X<input inputMode="numeric" value={base.x} onChange={(e) => setBase({ ...base, x: e.target.value })} /></label>
          <label>Y<input inputMode="numeric" value={base.y} onChange={(e) => setBase({ ...base, y: e.target.value })} /></label>
          <label>Z<input inputMode="numeric" value={base.z} onChange={(e) => setBase({ ...base, z: e.target.value })} /></label>
        </div>
        <div className="actions">
          <button type="button" className="button" onClick={handleSaveBase}>Guardar base</button>
        </div>
      </fieldset>

      <fieldset className="base-form">
        <legend>Tamaño (bloques). Actual: {detail.width} × {detail.height} × {detail.depth}</legend>
        <div className="dimension-grid">
          <label>Ancho (X)<input inputMode="numeric" placeholder={String(detail.width)} value={size.w} onChange={(e) => setSize({ ...size, w: e.target.value })} /></label>
          <label>Alto (Y)<input inputMode="numeric" placeholder={String(detail.height)} value={size.h} onChange={(e) => setSize({ ...size, h: e.target.value })} /></label>
          <label>Profundidad (Z)<input inputMode="numeric" placeholder={String(detail.depth)} value={size.d} onChange={(e) => setSize({ ...size, d: e.target.value })} /></label>
        </div>
        <div className="actions">
          <button type="button" className="button" onClick={handleResize}>Cambiar tamaño</button>
        </div>
        <p className="muted small">Los bloques que queden fuera del nuevo tamaño se borran, y se te pedirá confirmación antes.</p>
      </fieldset>

      <p className="muted">Cambios pendientes en {pending.size} celdas. Capa {y}: las celdas marcadas se guardan al pulsar "Guardar cambios".</p>
    </section>
  );
}

