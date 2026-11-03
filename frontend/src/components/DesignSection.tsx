import { useEffect, useState, type FormEvent } from "react";
import { authorsApi, designsApi } from "../api/designs";
import { errorMessage } from "../api/client";
import type { Author, FarmDesignSummary } from "../api/types";
import { FILE_INPUT_ACCEPT, formatBytes, kindLabel, validateUpload } from "../lib/files";

interface Props {
  farmId: number;
  designs: FarmDesignSummary[];
  onChanged: () => void;
}

export function DesignSection({ farmId, designs, onChanged }: Props) {
  return (
    <section>
      <h2>Diseños</h2>

      {designs.length === 0 && <p className="muted">Esta granja todavía no tiene diseños.</p>}

      {designs.map((design) => (
        <DesignCard key={design.id} design={design} onChanged={onChanged} />
      ))}

      <NewDesignForm farmId={farmId} onCreated={onChanged} />
    </section>
  );
}

function DesignCard({ design, onChanged }: { design: FarmDesignSummary; onChanged: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;

    const problem = validateUpload(file);
    if (problem) {
      setMessage({ kind: "error", text: problem });
      return;
    }

    setUploading(true);
    setMessage(null);
    try {
      await designsApi.uploadFile(design.id, file);
      setMessage({ kind: "ok", text: `"${file.name}" subido correctamente.` });
      onChanged();
    } catch (err) {
      setMessage({ kind: "error", text: errorMessage(err) });
    } finally {
      setUploading(false);
    }
  }

  return (
    <article className="design-card">
      <header>
        <h3>{design.name}</h3>
        {design.description && <p className="muted">{design.description}</p>}
      </header>

      {design.files.length > 0 ? (
        <ul className="file-list">
          {design.files.map((file) => (
            <li key={file.id}>
              <a href={designsApi.downloadUrl(file.id)} download={file.originalFileName}>
                {file.originalFileName}
              </a>{" "}
              <span className="muted">
                {kindLabel(file.kind)} · {formatBytes(file.sizeBytes)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">Sin archivos todavía.</p>
      )}

      <label className="upload">
        Subir archivo (.litematic, imagen o PDF, máx. 25 MB)
        <input
          type="file"
          accept={FILE_INPUT_ACCEPT}
          disabled={uploading}
          onChange={(e) => {
            void handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      {uploading && <p className="muted">Subiendo…</p>}
      {message && (
        <p className={message.kind === "error" ? "error" : "muted"} role={message.kind === "error" ? "alert" : "status"}>
          {message.text}
        </p>
      )}
    </article>
  );
}

function NewDesignForm({ farmId, onCreated }: { farmId: number; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [authorId, setAuthorId] = useState("");
  const [authors, setAuthors] = useState<Author[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      authorsApi.list().then(setAuthors).catch(() => setAuthors([]));
    }
  }, [open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError("El nombre del diseño es obligatorio.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await designsApi.create({
        farmId,
        name: name.trim(),
        description: description.trim() || null,
        authorId: authorId ? Number(authorId) : null,
      });
      setName("");
      setDescription("");
      setAuthorId("");
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="button" onClick={() => setOpen(true)}>
        Añadir diseño
      </button>
    );
  }

  return (
    <form className="design-form" onSubmit={handleSubmit} noValidate>
      <h3>Nuevo diseño</h3>
      <label htmlFor="design-name">
        Nombre *
        <input id="design-name" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label htmlFor="design-description">
        Descripción
        <textarea id="design-description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <label htmlFor="design-author">
        Creador
        <select id="design-author" value={authorId} onChange={(e) => setAuthorId(e.target.value)}>
          <option value="">Sin indicar</option>
          {authors.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="actions">
        <button type="submit" className="button button-primary" disabled={saving}>
          {saving ? "Guardando…" : "Crear diseño"}
        </button>
        <button type="button" className="button" onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
