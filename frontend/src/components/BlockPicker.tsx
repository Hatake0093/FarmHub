import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { BlockEntry } from "../api/blocks";
import { blockColor, blockLabel, isAir } from "../lib/litematicView";
import { blockDisplayName } from "../lib/blockSearch";
import { optionLabel, pushRecent, readRecent, visibleOptions, writeRecent } from "../lib/blockPicker";
import { forgetTexture, getTexture, requestTexture } from "../lib/textures";
import { hasTextureId } from "../lib/blockColors";

interface Props {
  catalog: BlockEntry[];
  value: string;
  onChange: (id: string) => void;
}

const BLOCK_ID = /^[a-z0-9_.-]+:[a-z0-9/_.-]+$/;

/** Selector compacto: bloque seleccionado, recientes, lista con desplazamiento y navegación por teclado. */
export function BlockPicker({ catalog, value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState<string[]>(() => readRecent());
  const [, setTick] = useState(0);
  // Plegado por defecto: solo se despliega al pulsar el bloque actual para cambiarlo.
  const [open, setOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  const options = useMemo(() => visibleOptions(catalog, query, recent), [catalog, query, recent]);
  const selected = catalog.find((b) => b.id === value);
  const typedId = query.trim();
  const truncated = options.length >= 200 || (!typedId && catalog.length > options.length);
  const showCustom = BLOCK_ID.test(typedId) && !catalog.some((b) => b.id === typedId);

  useEffect(() => setActive(0), [query]);

  // Con las flechas, la fila activa se mantiene a la vista dentro de la lista con desplazamiento.
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector(".block-row.active")?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  // Clic o toque fuera del selector lo cierra.
  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setQuery("");
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // Miniaturas de textura para las opciones visibles.
  useEffect(() => {
    for (const option of options.slice(0, 60)) {
      if (hasTextureId(option.id)) requestTexture(option.id, () => setTick((t) => t + 1));
    }
  }, [options]);

  function choose(id: string) {
    onChange(id);
    const next = pushRecent(recent, id);
    setRecent(next);
    writeRecent(next);
    setQuery("");
    setOpen(false);
  }

  function handleKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => Math.min(options.length - 1, i + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (options[active]) choose(options[active].id);
      else if (showCustom) choose(typedId);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setQuery("");
      setOpen(false);
    }
  }

  return (
    <div className="block-picker" ref={rootRef}>
      <button
        type="button"
        className="block-current"
        aria-expanded={open}
        aria-label="Cambiar bloque"
        onClick={() => setOpen((o) => !o)}
      >
        <Swatch id={value} />
        <span>
          <strong>{selected ? blockDisplayName(selected) : blockLabel(value)}</strong>
          <span className="muted small block-current-id">{value}</span>
        </span>
        <span className="block-current-action">{open ? "Cerrar" : "Cambiar"}</span>
      </button>

      {open && (
      <div className="block-popover">
      <input
        ref={searchRef}
        type="search"
        className="block-search"
        value={query}
        placeholder="Buscar en español, inglés o id…"
        aria-label="Buscar bloque"
        role="combobox"
        aria-expanded="true"
        aria-controls="block-listbox"
        aria-autocomplete="list"
        aria-activedescendant={options[active] ? `block-option-${options[active].id}` : undefined}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKey}
      />

      <ul className="block-list" id="block-listbox" role="listbox" aria-label="Bloques" ref={listRef}>
        {!query.trim() && recent.length > 0 && <li className="block-group">Recientes</li>}
        {options.map((block, index) => (
          <li
            key={block.id}
            id={`block-option-${block.id}`}
            role="option"
            aria-selected={block.id === value}
            className={`block-row${index === active ? " active" : ""}${block.id === value ? " selected" : ""}`}
            onMouseEnter={() => setActive(index)}
            onClick={() => choose(block.id)}
          >
            <Swatch id={block.id} />
            <span className="block-name">{optionLabel(block)}</span>
            <span className="block-id">{block.id.replace("minecraft:", "")}</span>
          </li>
        ))}
        {showCustom && (
          <li className="block-row" role="option" aria-selected={false} onClick={() => choose(typedId)}>
            <span className="block-name">Usar {typedId}</span>
          </li>
        )}
        {options.length === 0 && !showCustom && <li className="muted block-group">No hay bloques que coincidan.</li>}
      </ul>
      {truncated && (
        <p className="muted small" role="status">
          Mostrando {options.length} bloques. Escribe para buscar entre los {catalog.length}.
        </p>
      )}
      </div>
      )}
    </div>
  );
}

/** Color o miniatura de textura de un bloque. */
function Swatch({ id }: { id: string }) {
  if (isAir(id)) return <span className="swatch swatch-empty" aria-hidden="true" />;
  const texture = getTexture(id);
  if (texture || hasTextureId(id)) {
    return (
      <img
        className="swatch swatch-img"
        alt=""
        src={`/api/blocks/${id.replace("minecraft:", "")}/texture`}
        onError={() => forgetTexture(id)}
      />
    );
  }
  return <span className="swatch" style={{ background: blockColor(id) }} aria-hidden="true" />;
}
