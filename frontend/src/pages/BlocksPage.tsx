import { useEffect, useMemo, useState } from "react";
import { blocksApi, type BlockEntry } from "../api/blocks";
import { errorMessage } from "../api/client";
import { shortName } from "../lib/blockSearch";
import { setColorOverrides } from "../lib/blockColors";

export function BlocksPage() {
  const [blocks, setBlocks] = useState<BlockEntry[]>([]);
  const [search, setSearch] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [colorDrafts, setColorDrafts] = useState<Record<string, string | null>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    blocksApi
      .list("", false)
      .then((list) => {
        setBlocks(list);
        setColorOverrides(list);
      })
      .catch((err: unknown) => setError(errorMessage(err)));
  }

  useEffect(load, []);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return blocks.filter((b) => {
      if (onlyMissing && b.spanishName) return false;
      if (!term) return true;
      return (
        b.id.toLowerCase().includes(term) ||
        b.englishName.toLowerCase().includes(term) ||
        (b.spanishName?.toLowerCase().includes(term) ?? false)
      );
    });
  }, [blocks, search, onlyMissing]);

  const missingCount = blocks.filter((b) => !b.spanishName).length;

  async function save(block: BlockEntry) {
    const value = (drafts[block.id] ?? block.spanishName ?? "").trim();
    const color = block.id in colorDrafts ? colorDrafts[block.id] : block.color;
    setSavingId(block.id);
    setError(null);
    try {
      const updated = await blocksApi.setSpanish(shortName(block.id), value || null, color);
      const next = blocks.map((b) => (b.id === updated.id ? updated : b));
      setBlocks(next);
      setColorOverrides(next);
      setDrafts((current) => {
        const copy = { ...current };
        delete copy[block.id];
        return copy;
      });
      setColorDrafts((current) => {
        const copy = { ...current };
        delete copy[block.id];
        return copy;
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section>
      <div className="page-heading">
        <h1>Nombres de bloques</h1>
        <span className="muted">
          {blocks.length - missingCount} de {blocks.length} con nombre en español
        </span>
      </div>
      <p className="muted">
        Escribe el nombre en español de cada bloque. Se usa en el diseñador de esquemáticos. Déjalo vacío para volver al nombre en inglés.
      </p>

      <div className="filters">
        <label>
          Buscar
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Español, inglés o id" />
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} />
          Solo los que faltan
        </label>
      </div>

      {error && <p className="error" role="alert">{error}</p>}

      <table className="farm-table">
        <thead>
          <tr>
            <th>Inglés</th>
            <th>Identificador</th>
            <th>Nombre en español</th>
            <th>Color</th>
            <th aria-label="Acciones" />
          </tr>
        </thead>
        <tbody>
          {visible.map((b) => {
            const draft = drafts[b.id] ?? b.spanishName ?? "";
            return (
              <tr key={b.id}>
                <td>{b.englishName}</td>
                <td className="muted">{b.id}</td>
                <td>
                  <input
                    aria-label={`Nombre en español de ${b.englishName}`}
                    value={draft}
                    onChange={(e) => setDrafts((current) => ({ ...current, [b.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void save(b);
                    }}
                  />
                </td>
                <td>
                  <ColorField
                    label={`Color de ${b.englishName}`}
                    value={b.id in colorDrafts ? colorDrafts[b.id] : b.color}
                    onChange={(color) => setColorDrafts((current) => ({ ...current, [b.id]: color }))}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="button"
                    disabled={savingId === b.id}
                    onClick={() => void save(b)}
                  >
                    {savingId === b.id ? "Guardando…" : "Guardar"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {visible.length === 0 && <p className="muted">No hay bloques que coincidan.</p>}
    </section>
  );
}

/** Selector de color con opción de volver al automático. */
export function ColorField({ label, value, onChange }: { label: string; value: string | null; onChange: (color: string | null) => void }) {
  return (
    <div className="color-field">
      <input
        type="color"
        aria-label={label}
        value={value ?? "#808080"}
        onChange={(e) => onChange(e.target.value)}
      />
      {value ? (
        <button type="button" className="button-link" onClick={() => onChange(null)}>Automático</button>
      ) : (
        <span className="muted">Automático</span>
      )}
    </div>
  );
}
