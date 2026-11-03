import { useEffect, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { structurePreviewApi, type StructurePreview } from "../api/structurePreviews";
import { errorMessage } from "../api/client";
import { LitematicViewer } from "../components/LitematicViewer";
import { previewSource } from "../components/viewerSource";

/**
 * Explora archivos sueltos sin guardarlos: cada uno se lee en el servidor, se muestra y se descarta.
 * Nada se añade a los esquemáticos.
 */
export function StructurePreviewPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [index, setIndex] = useState(0);
  const [preview, setPreview] = useState<StructurePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = files[index] ?? null;

  // Carga la vista previa del archivo actual cada vez que cambia.
  useEffect(() => {
    if (!current) {
      setPreview(null);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    setPreview(null);
    structurePreviewApi
      .preview(current)
      .then((data) => active && setPreview(data))
      .catch((err: unknown) => active && setError(errorMessage(err)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [current]);

  // Flechas izquierda y derecha para recorrer los archivos.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, select")) return;
      if (event.key === "ArrowRight") setIndex((i) => Math.min(files.length - 1, i + 1));
      if (event.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [files.length]);

  function handlePick(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (picked.length === 0) return;
    setFiles(picked);
    setIndex(0);
  }

  const source = preview ? previewSource(preview) : null;

  return (
    <section>
      <div className="page-heading structures-heading">
        <div>
          <h1>Explorar archivos</h1>
          <p className="muted">
            Abre varios archivos y pasa de uno a otro sin guardarlos. Nada se añade a tus esquemáticos.
          </p>
        </div>
        <div className="structures-actions">
          <label className="button button-primary">
            Elegir archivos
            <input type="file" hidden multiple accept=".litematic,.schem,.nbt" onChange={handlePick} />
          </label>
          <Link to="/structures" className="button">Volver a esquemáticos</Link>
        </div>
      </div>

      {files.length === 0 && (
        <div className="empty-state">
          <p>Elige uno o varios archivos .litematic, .schem o .nbt.</p>
          <p className="muted">Después usa las flechas o los botones para cambiar de archivo.</p>
        </div>
      )}

      {files.length > 0 && (
        <nav className="preview-nav" aria-label="Archivos">
          <button type="button" className="button" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
            ← Anterior
          </button>
          <span className="preview-counter">
            {index + 1} de {files.length} · <strong>{current?.name}</strong>
          </span>
          <button
            type="button"
            className="button"
            onClick={() => setIndex((i) => Math.min(files.length - 1, i + 1))}
            disabled={index === files.length - 1}
          >
            Siguiente →
          </button>
        </nav>
      )}

      {loading && <p className="muted">Leyendo {current?.name}…</p>}
      {error && <p className="error" role="alert">{error}</p>}

      {preview && (
        <div className="preview-summary muted small">
          {preview.summary.name && <span>Nombre: {preview.summary.name}</span>}
          {preview.summary.author && <span> · Autor: {preview.summary.author}</span>}
          <span> · {preview.summary.regions.length} región(es)</span>
          <span> · {preview.summary.totalBlocks.toLocaleString("es-ES")} bloques</span>
        </div>
      )}

      {source && current && <LitematicViewer key={current.name + index} source={source} title={current.name} />}
    </section>
  );
}
