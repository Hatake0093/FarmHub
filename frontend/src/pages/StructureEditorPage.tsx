import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { structuresApi, type StructureDetail, type StructureLayer } from "../api/structures";
import { errorMessage } from "../api/client";
import { blockColor, blockLabel, isAir } from "../lib/litematicView";
import {
  displayedBlock,
  toPatchChanges,
  withChange,
  worldCoordinates,
  type Coordinates,
  type PendingChanges,
} from "../lib/structureEdit";

const COMMON_BLOCKS = [
  "minecraft:stone", "minecraft:cobblestone", "minecraft:smooth_stone", "minecraft:oak_planks",
  "minecraft:glass", "minecraft:iron_block", "minecraft:hopper", "minecraft:chest",
  "minecraft:observer", "minecraft:piston", "minecraft:sticky_piston", "minecraft:dispenser",
  "minecraft:redstone_wire", "minecraft:rail", "minecraft:powered_rail", "minecraft:lever",
  "minecraft:water", "minecraft:sugar_cane", "minecraft:cauldron", "minecraft:dirt",
];

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
  const [base, setBase] = useState({ x: "0", y: "0", z: "0" });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paintingRef = useRef(false);

  const cell = useMemo(() => {
    if (!detail) return 16;
    return Math.max(4, Math.min(32, Math.floor(880 / detail.width)));
  }, [detail]);

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !layer || !detail) return;
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
  }, [layer, pending, hover, y, cell, detail]);

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
          Capa Y local: {y} / {detail.height - 1}
          <input type="range" min={0} max={detail.height - 1} value={y} onChange={(e) => setY(Number(e.target.value))} />
        </label>
        <label>
          Bloque
          <input list="common-blocks" value={block} onChange={(e) => { setBlock(e.target.value); setErase(false); }} />
          <datalist id="common-blocks">
            {COMMON_BLOCKS.map((b) => <option key={b} value={b} />)}
          </datalist>
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={erase} onChange={(e) => setErase(e.target.checked)} />
          Borrar (aire)
        </label>
      </div>

      <canvas
        ref={canvasRef}
        className="viewer-canvas structure-canvas"
        onMouseDown={handleDown}
        onMouseMove={handleMove}
        onMouseUp={stopPainting}
        onMouseLeave={() => { stopPainting(); setHover(null); }}
      />

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
