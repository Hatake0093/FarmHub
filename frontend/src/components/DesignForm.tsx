import { useEffect, useState, type FormEvent } from "react";
import { authorsApi } from "../api/designs";
import { errorMessage } from "../api/client";
import type { Author } from "../api/types";

export interface DesignFormValues {
  name: string;
  description: string;
  authorId: string;
}

interface Props {
  title: string;
  initial: DesignFormValues;
  submitLabel: string;
  saving: boolean;
  error: string | null;
  onSubmit: (values: DesignFormValues) => void;
  onCancel: () => void;
}

export function DesignForm({ title, initial, submitLabel, saving, error, onSubmit, onCancel }: Props) {
  const [values, setValues] = useState<DesignFormValues>(initial);
  const [validation, setValidation] = useState<string | null>(null);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [newAuthor, setNewAuthor] = useState("");
  const [addingAuthor, setAddingAuthor] = useState(false);
  const [authorError, setAuthorError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    authorsApi.list().then((list) => active && setAuthors(list)).catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  function set<K extends keyof DesignFormValues>(key: K, value: DesignFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!values.name.trim()) {
      setValidation("El nombre del diseño es obligatorio.");
      document.getElementById("design-name")?.focus();
      return;
    }
    setValidation(null);
    onSubmit(values);
  }

  async function handleAddAuthor() {
    const name = newAuthor.trim();
    if (!name) {
      setAuthorError("Escribe el nombre del creador.");
      return;
    }
    setAuthorError(null);
    try {
      const created = await authorsApi.create(name);
      setAuthors((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      set("authorId", String(created.id));
      setNewAuthor("");
      setAddingAuthor(false);
    } catch (err) {
      setAuthorError(errorMessage(err));
    }
  }

  return (
    <form className="design-form" onSubmit={handleSubmit} noValidate>
      <h3>{title}</h3>
      <label htmlFor="design-name">
        Nombre *
        <input
          id="design-name"
          autoFocus
          required
          maxLength={200}
          aria-invalid={validation ? true : undefined}
          aria-describedby={validation ? "design-name-error" : undefined}
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
        />
        {validation && (
          <span id="design-name-error" className="field-error">
            {validation}
          </span>
        )}
      </label>
      <label htmlFor="design-description">
        Descripción
        <textarea
          id="design-description"
          rows={3}
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </label>
      <label htmlFor="design-author">
        Creador
        <select id="design-author" value={values.authorId} onChange={(e) => set("authorId", e.target.value)}>
          <option value="">Sin indicar</option>
          {authors.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>

      {addingAuthor ? (
        <div className="inline-add">
          <input
            aria-label="Nombre del nuevo creador"
            placeholder="Nombre del creador"
            value={newAuthor}
            autoFocus
            onChange={(e) => setNewAuthor(e.target.value)}
            onKeyDown={(e) => {
              // Intro añade el creador; sin esto enviaría todo el formulario del diseño.
              if (e.key === "Enter") {
                e.preventDefault();
                void handleAddAuthor();
              }
            }}
          />
          <button type="button" className="button" onClick={handleAddAuthor}>
            Añadir creador
          </button>
          <button type="button" className="button" onClick={() => setAddingAuthor(false)}>
            Cancelar
          </button>
          {authorError && <span className="field-error">{authorError}</span>}
        </div>
      ) : (
        <button type="button" className="button-link" onClick={() => setAddingAuthor(true)}>
          + Nuevo creador
        </button>
      )}

      {error && <p className="alert" role="alert">{error}</p>}
      <div className="actions">
        <button type="submit" className="button button-primary" disabled={saving}>
          {saving ? "Guardando…" : submitLabel}
        </button>
        <button type="button" className="button" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
