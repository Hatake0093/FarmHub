import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
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

  const options = useMemo(() => visibleOptions(catalog, query, recent), [catalog, query, recent]);
  const selected = catalog.find((b) => b.id === value);
  const typedId = query.trim();
  const showCustom = BLOCK_ID.test(typedId) && !catalog.some((b) => b.id === typedId);

  useEffect(() => setActive(0), [query]);

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
    }
  }

  return (
    <div className="block-picker">
      <div className="block-current">
        <Swatch id={value} />
        <div>
          <strong>{selected ? blockDisplayName(selected) : blockLabel(value)}</strong>
          <div className="muted small">{value}</div>
        </div>
      </div>

      <input
        type="search"
        className="block-search"
        value={query}
        placeholder="Buscar en español, inglés o id…"
        aria-label="Buscar bloque"
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKey}
      />

      <ul className="block-list" role="listbox" aria-label="Bloques">
        {!query.trim() && recent.length > 0 && <li className="block-group">Recientes</li>}
        {options.map((block, index) => (
          <li
            key={block.id}
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
