import { useState, type DragEvent } from "react";
import { designsApi } from "../api/designs";
import { errorMessage } from "../api/client";
import type { FarmDesignSummary } from "../api/types";
import { DesignForm, type DesignFormValues } from "./DesignForm";
import { FILE_INPUT_ACCEPT, STRUCTURE_KINDS, formatBytes, kindLabel, validateUpload } from "../lib/files";
import { LitematicViewer } from "./LitematicViewer";
import { useFeedback } from "../lib/feedback";

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
  const { confirm } = useFeedback();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [dragging, setDragging] = useState(false);
  const [viewing, setViewing] = useState<{ id: number; name: string } | null>(null);

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
    const confirmed = await confirm({
      title: "Borrar diseño",
      message: `¿Borrar el diseño "${design.name}" y sus ${design.files.length} archivos? No se puede deshacer.`,
      confirmLabel: "Borrar diseño",
      danger: true,
    });
    if (!confirmed) return;
    try {
      await designsApi.remove(design.id);
      onChanged();
    } catch (err) {
      setFeedback({ kind: "error", text: errorMessage(err) });
    }
  }

  async function handleRemoveFile(fileId: number, fileName: string) {
    const accepted = await confirm({
      title: "Borrar archivo",
      message: `¿Borrar el archivo "${fileName}"?`,
      confirmLabel: "Borrar archivo",
      danger: true,
    });
    if (!accepted) return;
    try {
      await designsApi.removeFile(fileId);
      onChanged();
    } catch (err) {
      setFeedback({ kind: "error", text: errorMessage(err) });
    }
  }

  async function handleFiles(files: File[]) {
    if (files.length === 0) return;

    setUploading(true);
    setFeedback(null);
    const problems: string[] = [];
    let uploaded = 0;
    for (const file of files) {
      const problem = validateUpload(file);
      if (problem) {
        problems.push(files.length > 1 ? `${file.name}: ${problem}` : problem);
        continue;
      }
      try {
        await designsApi.uploadFile(design.id, file);
        uploaded++;
      } catch (err) {
        problems.push(files.length > 1 ? `${file.name}: ${errorMessage(err)}` : errorMessage(err));
      }
    }
    setUploading(false);
    if (uploaded > 0) onChanged();
    if (problems.length > 0) {
      setFeedback({ kind: "error", text: problems.join(" ") });
    } else {
      setFeedback({
        kind: "ok",
        text: uploaded === 1 ? `"${files[0].name}" subido correctamente.` : `${uploaded} archivos subidos correctamente.`,
      });
    }
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    if (!uploading) void handleFiles(Array.from(event.dataTransfer.files));
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
        <ul className="file-list file-rows">
          {design.files.map((file) => (
            <li key={file.id}>
              <a href={designsApi.downloadUrl(file.id)} download={file.originalFileName}>
                {file.originalFileName}
              </a>{" "}
              <span className="muted">
                {kindLabel(file.kind)} · {formatBytes(file.sizeBytes)}
              </span>{" "}
              {STRUCTURE_KINDS.includes(file.kind) && (
                <button
                  type="button"
                  className="button-link"
                  aria-label={`Ver ${file.originalFileName}`}
                  onClick={() => setViewing({ id: file.id, name: file.originalFileName })}
                >
                  Ver
                </button>
              )}{" "}
              <button
                type="button"
                className="button-link button-danger"
                aria-label={`Borrar el archivo ${file.originalFileName}`}
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

      {viewing && (
        <LitematicViewer fileId={viewing.id} fileName={viewing.name} onClose={() => setViewing(null)} />
      )}

      <label
        className={`upload dropzone${dragging ? " dragging" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <strong>Subir archivo</strong>
        <span className="muted small">
          Arrastra aquí uno o varios archivos o haz clic (.litematic, .schem, .nbt, imagen o PDF, máx. 25 MB)
        </span>
        <input
          type="file"
          multiple
          className="visually-hidden"
          accept={FILE_INPUT_ACCEPT}
          disabled={uploading}
          onChange={(e) => {
            void handleFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </label>
      {uploading && (
        <p className="muted" role="status">
          Subiendo…
        </p>
      )}
      {feedback && (
        <p className={feedback.kind === "error" ? "alert" : "notice"} role={feedback.kind === "error" ? "alert" : "status"}>
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
