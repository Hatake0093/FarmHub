import { useMemo, useState } from "react";
import { designsApi } from "../api/designs";
import { errorMessage } from "../api/client";
import type { FarmDesignSummary } from "../api/types";
import { DesignForm, type DesignFormValues } from "./DesignForm";
import { FILE_INPUT_ACCEPT, STRUCTURE_KINDS, formatBytes, kindLabel, validateUpload } from "../lib/files";
import { LitematicViewer } from "./LitematicViewer";
import { savedFileSource } from "./viewerSource";

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

      <NewDesignSection farmId={farmId} onCreated={onChanged} />
    </section>
  );
}

type Feedback = { kind: "ok" | "error"; text: string } | null;

function DesignCard({ design, onChanged }: { design: FarmDesignSummary; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [viewing, setViewing] = useState<{ id: number; name: string } | null>(null);
  const viewerSource = useMemo(() => (viewing ? savedFileSource(viewing.id) : null), [viewing]);

  async function handleSave(values: DesignFormValues) {
    setSaving(true);
    setSaveError(null);
    try {
      await designsApi.update(design.id, {
        name: values.name.trim(),
        description: values.description.trim() || null,
        authorId: values.authorId ? Number(values.authorId) : null,
      });
      setEditing(false);
      onChanged();
    } catch (err) {
      setSaveError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `¿Borrar el diseño "${design.name}" y sus ${design.files.length} archivos? No se puede deshacer.`,
    );
    if (!confirmed) return;
    try {
      await designsApi.remove(design.id);
      onChanged();
    } catch (err) {
      setFeedback({ kind: "error", text: errorMessage(err) });
    }
  }

  async function handleRemoveFile(fileId: number, fileName: string) {
    if (!window.confirm(`¿Borrar el archivo "${fileName}"?`)) return;
    try {
      await designsApi.removeFile(fileId);
      onChanged();
    } catch (err) {
      setFeedback({ kind: "error", text: errorMessage(err) });
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;

    const problem = validateUpload(file);
    if (problem) {
      setFeedback({ kind: "error", text: problem });
      return;
    }

    setUploading(true);
    setFeedback(null);
    try {
      await designsApi.uploadFile(design.id, file);
      setFeedback({ kind: "ok", text: `"${file.name}" subido correctamente.` });
      onChanged();
    } catch (err) {
      setFeedback({ kind: "error", text: errorMessage(err) });
    } finally {
      setUploading(false);
    }
  }

  if (editing) {
    return (
      <DesignForm
        title="Editar diseño"
        initial={{
          name: design.name,
          description: design.description ?? "",
          authorId: design.authorId ? String(design.authorId) : "",
        }}
        submitLabel="Guardar cambios"
        saving={saving}
        error={saveError}
        onSubmit={handleSave}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <article className="design-card">
      <header className="design-header">
        <div>
          <h3>{design.name}</h3>
          {design.description && <p className="muted">{design.description}</p>}
          {design.authorName && <p className="muted">Creador: {design.authorName}</p>}
        </div>
        <div className="actions">
          <button type="button" className="button" onClick={() => setEditing(true)}>
            Editar
          </button>
          <button type="button" className="button button-danger" onClick={handleDelete}>
            Borrar diseño
          </button>
        </div>
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
              </span>{" "}
              {STRUCTURE_KINDS.includes(file.kind) && (
                <button type="button" className="button-link" onClick={() => setViewing({ id: file.id, name: file.originalFileName })}>
                  Ver
                </button>
              )}{" "}
              <button
                type="button"
                className="button-link button-danger"
                onClick={() => handleRemoveFile(file.id, file.originalFileName)}
              >
                Borrar archivo
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">Sin archivos todavía.</p>
      )}

      {viewing && viewerSource && (
        <LitematicViewer source={viewerSource} title={viewing.name} onClose={() => setViewing(null)} />
      )}

      <label className="upload">
        Subir archivo (.litematic, .schem, .nbt, imagen o PDF, máx. 25 MB)
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
      {feedback && (
        <p className={feedback.kind === "error" ? "error" : "muted"} role={feedback.kind === "error" ? "alert" : "status"}>
          {feedback.text}
        </p>
      )}
    </article>
  );
}

function NewDesignSection({ farmId, onCreated }: { farmId: number; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button type="button" className="button" onClick={() => setOpen(true)}>
        Añadir diseño
      </button>
    );
  }

  async function handleCreate(values: DesignFormValues) {
    setSaving(true);
    setError(null);
    try {
      await designsApi.create({
        farmId,
        name: values.name.trim(),
        description: values.description.trim() || null,
        authorId: values.authorId ? Number(values.authorId) : null,
      });
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <DesignForm
      title="Nuevo diseño"
      initial={{ name: "", description: "", authorId: "" }}
      submitLabel="Crear diseño"
      saving={saving}
      error={error}
      onSubmit={handleCreate}
      onCancel={() => setOpen(false)}
    />
  );
}
