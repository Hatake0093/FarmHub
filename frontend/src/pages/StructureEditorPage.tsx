import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { structuresApi, type StructureDetail, type StructureLayer } from "../api/structures";
import { blocksApi, type BlockEntry } from "../api/blocks";
import { blockDisplayName, searchBlocks } from "../lib/blockSearch";
import { errorMessage } from "../api/client";
import { blockColor, blockLabel, isAir } from "../lib/litematicView";
import { gridFromLayers, MAX_ISOMETRIC_VOLUME, type VoxelGrid } from "../lib/isometric";
import { IsometricView } from "../components/IsometricView";
import { LayerStepper } from "../components/LayerStepper";
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
  const [mode, setMode] = useState<"layer" | "iso">("layer");
  const [catalog, setCatalog] = useState<BlockEntry[]>([]);
  const [blockQuery, setBlockQuery] = useState("");
  const [isoGrid, setIsoGrid] = useState<VoxelGrid | null>(null);
  const [isoMessage, setIsoMessage] = useState<string | null>(null);
  const [base, setBase] = useState({ x: "0", y: "0", z: "0" });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paintingRef = useRef(false);

  const cell = useMemo(() => {
    if (!detail) return 16;
    return Math.max(4, Math.min(32, Math.floor(880 / detail.width)));
  }, [detail]);

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

  // Vista isométrica: muestra lo guardado en el servidor, con todas las capas.
  useEffect(() => {
    if (mode !== "iso" || !detail) return;
    const volume = detail.width * detail.height * detail.depth;
    if (volume > MAX_ISOMETRIC_VOLUME) {
      setIsoGrid(null);
      setIsoMessage(`El esquemático tiene ${volume.toLocaleString("es-ES")} bloques; la vista isométrica admite hasta ${MAX_ISOMETRIC_VOLUME.toLocaleString("es-ES")}.`);
      return;
    }
    let active = true;
    setIsoMessage("Cargando capas…");
    Promise.all(Array.from({ length: detail.height }, (_, yy) => structuresApi.layer(structureId, yy)))
      .then((layers) => {
        if (!active) return;
        setIsoGrid(gridFromLayers(detail.width, detail.height, detail.depth, layers));
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

    for (let z = 0; z < layer.depth; z++) {
      for (let x = 0; x < layer.width; x++) {
        const serverBlock = layer.palette[layer.cells[z * layer.width + x]];
        const shown = displayedBlock(pending, { x, y, z }, serverBlock);
        if (isAir(shown)) continue;
        ctx.fillStyle = blockColor(shown);
        ctx.fillRect(x * cell, z * cell, cell - 1, cell - 1);
      }
    }

    if (hover && hover.y === y) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.strokeRect(hover.x * cell, hover.z * cell, cell - 1, cell - 1);
    }
  }, [layer, pending, hover, y, cell, detail, mode]);

  function localAt(event: MouseEvent<HTMLCanvasElement>): Coordinates | null {
    const canvas = canvasRef.current;
    if (!canvas || !layer) return null;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((event.clientX - rect.left) * canvas.width) / rect.width / cell);
    const z = Math.floor(((event.clientY - rect.top) * canvas.height) / rect.height / cell);
    if (x < 0 || z < 0 || x >= layer.width || z >= layer.depth) return null;
    return { x, y, z };
  }

  function paint(local: Coordinates) {
    if (!layer) return;
    const target = erase ? null : block.trim();
    if (target !== null && !BLOCK_ID.test(target)) {
      setError(`"${target}" no es un identificador de bloque válido (p. ej. minecraft:stone).`);
      return;
    }
    setPending((current) => withChange(current, local, target));
  }

  function chooseBlock(id: string) {
    setBlock(id);
    setErase(false);
    setBlockQuery("");
  }

  function handleDown(event: MouseEvent<HTMLCanvasElement>) {
    const local = localAt(event);
    if (!local) return;
    paintingRef.current = true;
    setHover(local);
    paint(local);
  }

  function handleMove(event: MouseEvent<HTMLCanvasElement>) {
    const local = localAt(event);
    setHover(local);
    if (local && paintingRef.current) paint(local);
  }

  function stopPainting() {
    paintingRef.current = false;
  }

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
          <select value={mode} onChange={(e) => setMode(e.target.value as "layer" | "iso")}>
            <option value="layer">Capa 2D (editable)</option>
            <option value="iso">Isométrica (guardado)</option>
          </select>
        </label>
        {mode === "layer" && (
        <LayerStepper value={y} max={detail.height - 1} onChange={setY} />
        )}
        {mode === "layer" && (
        <div className="block-picker">
          <label>
            Bloque: <strong>{currentBlockLabel(catalog, block)}</strong>
            <input
              type="search"
              value={blockQuery}
              placeholder="Buscar en español, inglés o id"
              onChange={(e) => setBlockQuery(e.target.value)}
            />
          </label>
          <div className="block-options">
            {searchBlocks(catalog, blockQuery).map((b) => (
              <button
                key={b.id}
                type="button"
                className={`block-option${b.id === block ? " selected" : ""}`}
                onClick={() => chooseBlock(b.id)}
              >
                {blockDisplayName(b)} <span className="muted">{b.id}</span>
              </button>
            ))}
            {BLOCK_ID.test(blockQuery.trim()) && !catalog.some((b) => b.id === blockQuery.trim()) && (
              <button type="button" className="block-option" onClick={() => chooseBlock(blockQuery.trim())}>
                Usar {blockQuery.trim()}
              </button>
            )}
          </div>
        </div>
        )}
        {mode === "layer" && (
        <label className="checkbox">
          <input type="checkbox" checked={erase} onChange={(e) => setErase(e.target.checked)} />
          Borrar (aire)
        </label>
        )}
      </div>

      {mode === "iso" && (isoGrid ? <IsometricView grid={isoGrid} /> : <p className="muted">{isoMessage}</p>)}

      {mode === "layer" && <canvas
        ref={canvasRef}
        className="viewer-canvas structure-canvas"
        onMouseDown={handleDown}
        onMouseMove={handleMove}
        onMouseUp={stopPainting}
        onMouseLeave={() => { stopPainting(); setHover(null); }}
      />}

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

      <p className="muted">Cambios pendientes en {pending.size} celdas. Capa {y}: las celdas marcadas se guardan al pulsar "Guardar cambios".</p>
    </section>
  );
}

function currentBlockLabel(catalog: BlockEntry[], id: string): string {
  const entry = catalog.find((b) => b.id === id);
  return entry ? blockDisplayName(entry) : id;
}
