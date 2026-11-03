import { useEffect, useMemo, useState } from "react";
import { blocksApi, type BlockEntry } from "../api/blocks";
import { errorMessage } from "../api/client";
import { shortName } from "../lib/blockSearch";

export function BlocksPage() {
  const [blocks, setBlocks] = useState<BlockEntry[]>([]);
  const [search, setSearch] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    blocksApi.list("", false).then(setBlocks).catch((err: unknown) => setError(errorMessage(err)));
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
    setSavingId(block.id);
    setError(null);
    try {
      const updated = await blocksApi.setSpanish(shortName(block.id), value || null);
      setBlocks((current) => current.map((b) => (b.id === updated.id ? updated : b)));
      setDrafts((current) => {
        const next = { ...current };
        delete next[block.id];
        return next;
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
                  <button
                    type="button"
                    className="button"
                    disabled={savingId === b.id || draft.trim() === (b.spanishName ?? "")}
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
