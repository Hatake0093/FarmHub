import { useEffect, useMemo, useState } from "react";
import { blocksApi, type BlockEntry } from "../api/blocks";
import { errorMessage } from "../api/client";
import { shortName } from "../lib/blockSearch";
import { setColorOverrides } from "../lib/blockColors";
import { forgetTexture } from "../lib/textures";
import { matchTextureFiles } from "../lib/textureImport";

export function BlocksPage() {
  const [blocks, setBlocks] = useState<BlockEntry[]>([]);
  const [search, setSearch] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [colorDrafts, setColorDrafts] = useState<Record<string, string | null>>({});
  const [newBlock, setNewBlock] = useState("");
  const [importPreview, setImportPreview] = useState<{ matched: { file: File; blockId: string }[]; unmatched: File[] } | null>(null);
  const [importProgress, setImportProgress] = useState<string | null>(null);
  // Versión de cada textura para que la miniatura se recargue tras subir una nueva.
  const [textureVersion, setTextureVersion] = useState<Record<string, number>>({});
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

  async function uploadTexture(block: BlockEntry, file: File | undefined) {
    if (!file) return;
    setSavingId(block.id);
    setError(null);
    try {
      const updated = await blocksApi.uploadTexture(shortName(block.id), file);
      forgetTexture(block.id);
      setTextureVersion((current) => ({ ...current, [block.id]: Date.now() }));
      const next = blocks.map((b) => (b.id === updated.id ? updated : b));
      setBlocks(next);
      setColorOverrides(next);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSavingId(null);
    }
  }

  async function removeTexture(block: BlockEntry) {
    setError(null);
    try {
      await blocksApi.removeTexture(shortName(block.id));
      forgetTexture(block.id);
      const next = blocks.map((b) => (b.id === block.id ? { ...b, hasTexture: false } : b));
      setBlocks(next);
      setColorOverrides(next);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  function previewImport(files: File[]) {
    const ids = new Set(blocks.map((b) => b.id));
    setImportPreview(matchTextureFiles(files, ids));
    setImportProgress(null);
  }

  async function runImport() {
    if (!importPreview) return;
    const total = importPreview.matched.length;
    let done = 0;
    let failed = 0;
    let latest = blocks;
    for (const { file, blockId } of importPreview.matched) {
      done++;
      setImportProgress(`Subiendo ${done} de ${total}…`);
      try {
        const updated = await blocksApi.uploadTexture(shortName(blockId), file);
        forgetTexture(blockId);
        setTextureVersion((current) => ({ ...current, [blockId]: Date.now() }));
        latest = latest.map((b) => (b.id === updated.id ? updated : b));
      } catch {
        failed++;
      }
    }
    setBlocks(latest);
    setColorOverrides(latest);
    setImportProgress(`Listo: ${total - failed} subidas${failed ? `, ${failed} con error` : ""}.`);
    setImportPreview(null);
  }

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

      <section className="import-box">
        <h2>Carga masiva de texturas</h2>
        <p className="muted">
          Elige una carpeta o varias imágenes. Cada archivo se asigna al bloque con el mismo nombre (por ejemplo <code>stone.png</code> → Piedra). Revisa los que no coinciden antes de subir.
        </p>
        <div className="actions">
          <label className="button">
            Elegir carpeta
            <input
              type="file"
              hidden
              multiple
              accept="image/png,image/jpeg,image/webp"
              {...{ webkitdirectory: "" }}
              onChange={(e) => previewImport(Array.from(e.target.files ?? []))}
            />
          </label>
          <label className="button">
            Elegir imágenes
            <input
              type="file"
              hidden
              multiple
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => previewImport(Array.from(e.target.files ?? []))}
            />
          </label>
        </div>

        {importPreview && (
          <div className="import-preview">
            <p>
              <strong>{importPreview.matched.length}</strong> coinciden con un bloque;{" "}
              <strong>{importPreview.unmatched.length}</strong> no tienen bloque con ese nombre.
            </p>
            {importPreview.unmatched.length > 0 && (
              <details>
                <summary>Ver los que no coinciden</summary>
                <p className="muted">{importPreview.unmatched.map((f) => f.name).join(", ")}</p>
              </details>
            )}
            <div className="actions">
              <button
                type="button"
                className="button button-primary"
                disabled={importPreview.matched.length === 0}
                onClick={() => void runImport()}
              >
                Subir {importPreview.matched.length} texturas
              </button>
              <button type="button" className="button" onClick={() => setImportPreview(null)}>Cancelar</button>
            </div>
          </div>
        )}
        {importProgress && <p className="muted" role="status">{importProgress}</p>}
      </section>

      <form
        className="inline-form"
        noValidate
        onSubmit={async (event) => {
          event.preventDefault();
          if (!newBlock.trim()) return;
          setError(null);
          try {
            await blocksApi.add(newBlock.trim());
            setNewBlock("");
            load();
          } catch (err) {
            setError(errorMessage(err));
          }
        }}
      >
        <input
          aria-label="Identificador del nuevo bloque"
          placeholder="Nuevo bloque, p. ej. cherry_sign"
          value={newBlock}
          onChange={(e) => setNewBlock(e.target.value)}
        />
        <button type="submit" className="button button-primary">Añadir bloque</button>
      </form>

      <table className="farm-table">
        <thead>
          <tr>
            <th>Inglés</th>
            <th>Identificador</th>
            <th>Nombre en español</th>
            <th>Color</th>
            <th>Textura</th>
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
                  <div className="texture-field">
                    {b.hasTexture && (
                      <img
                        className="texture-thumb"
                        alt={`Textura de ${b.englishName}`}
                        src={`/api/blocks/${shortName(b.id)}/texture?v=${textureVersion[b.id] ?? 0}`}
                      />
                    )}
                    <label className="button-link">
                      {b.hasTexture ? "Cambiar" : "Subir imagen"}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        aria-label={`Subir textura de ${b.englishName}`}
                        hidden
                        onChange={(e) => {
                          void uploadTexture(b, e.target.files?.[0]);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {b.hasTexture && (
                      <button type="button" className="button-link button-danger" onClick={() => void removeTexture(b)}>
                        Quitar
                      </button>
                    )}
                  </div>
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
