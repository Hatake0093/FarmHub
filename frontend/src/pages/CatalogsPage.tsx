import { useEffect, useState, type FormEvent } from "react";
import { categoriesApi, versionsApi } from "../api/farms";
import { errorMessage } from "../api/client";
import type { Category, MinecraftVersion } from "../api/types";
import { useDocumentTitle } from "../lib/useDocumentTitle";

export function CatalogsPage() {
  useDocumentTitle("Catálogos");
  return (
    <section>
      <div className="page-heading">
        <h1>Catálogos</h1>
      </div>
      <p className="muted">
        Categorías y versiones de Minecraft que usan las granjas. Un elemento en uso no se puede borrar.
      </p>
      <CategoriesSection />
      <VersionsSection />
    </section>
  );
}

function useList<T>(load: () => Promise<T[]>) {
  const [items, setItems] = useState<T[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    load().then(setItems).catch(() => setItems([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);
  return { items, reload: () => setReloadKey((k) => k + 1) };
}

function CategoriesSection() {
  const { items, reload } = useList<Category>(() => categoriesApi.list());
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>, onDone?: () => void) {
    setError(null);
    try {
      await action();
      onDone?.();
      reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    void run(() => categoriesApi.create({ name: name.trim(), description: description.trim() || null }), () => {
      setName("");
      setDescription("");
    });
  }

  function startEdit(category: Category) {
    setEditingId(category.id);
    setEditName(category.name);
    setEditDescription(category.description ?? "");
  }

  return (
    <section className="catalog">
      <h2>Categorías</h2>
      <table className="farm-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Descripción</th>
            <th aria-label="Acciones" />
          </tr>
        </thead>
        <tbody>
          {items.map((c) =>
            editingId === c.id ? (
              <tr key={c.id}>
                <td>
                  <input aria-label="Nombre de la categoría" value={editName} onChange={(e) => setEditName(e.target.value)} />
                </td>
                <td>
                  <input aria-label="Descripción de la categoría" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
                </td>
                <td className="actions">
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() =>
                      void run(
                        () => categoriesApi.update(c.id, { name: editName.trim(), description: editDescription.trim() || null }),
                        () => setEditingId(null),
                      )
                    }
                  >
                    Guardar
                  </button>
                  <button type="button" className="button" onClick={() => setEditingId(null)}>
                    Cancelar
                  </button>
                </td>
              </tr>
            ) : (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td className="muted">{c.description ?? "—"}</td>
                <td className="actions">
                  <button type="button" className="button-link" onClick={() => startEdit(c)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="button-link button-danger"
                    onClick={() => {
                      if (window.confirm(`¿Borrar la categoría "${c.name}"?`)) {
                        void run(() => categoriesApi.remove(c.id));
                      }
                    }}
                  >
                    Borrar
                  </button>
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>

      <form className="inline-form" onSubmit={handleCreate} noValidate>
        <input aria-label="Nombre de la nueva categoría" placeholder="Nueva categoría" value={name} onChange={(e) => setName(e.target.value)} />
        <input aria-label="Descripción de la nueva categoría" placeholder="Descripción (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        <button type="submit" className="button button-primary">Añadir categoría</button>
      </form>
      {error && <p className="alert" role="alert">{error}</p>}
    </section>
  );
}

function VersionsSection() {
  const { items, reload } = useList<MinecraftVersion>(() => versionsApi.list());
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
      reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError("El nombre de la versión es obligatorio.");
      return;
    }
    void run(() => versionsApi.create(name.trim())).then(() => setName(""));
  }

  return (
    <section className="catalog">
      <h2>Versiones de Minecraft Java</h2>
      {items.length === 0 && <p className="muted">No hay versiones registradas.</p>}
      <ul className="file-list">
        {items.map((v) => (
          <li key={v.id}>
            {v.name}{" "}
            <button
              type="button"
              className="button-link button-danger"
              onClick={() => {
                if (window.confirm(`¿Borrar la versión ${v.name}?`)) {
                  void run(() => versionsApi.remove(v.id));
                }
              }}
            >
              Borrar
            </button>
          </li>
        ))}
      </ul>

      <form className="inline-form" onSubmit={handleAdd} noValidate>
        <input aria-label="Nueva versión" placeholder="p. ej. 1.21.4" value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit" className="button button-primary">Añadir versión</button>
      </form>
      {error && <p className="alert" role="alert">{error}</p>}
    </section>
  );
}
