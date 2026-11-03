import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { structuresApi, type StructureListItem } from "../api/structures";
import { errorMessage } from "../api/client";
import { plural } from "../lib/plural";
import { validateStructureForm } from "../lib/structureForm";
import { useDocumentTitle } from "../lib/useDocumentTitle";

const dateFormat = new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" });

const EMPTY = { name: "", description: "", width: "8", height: "4", depth: "8", baseX: "0", baseY: "64", baseZ: "0" };

export function StructuresPage() {
  useDocumentTitle("Esquemáticos");
  const navigate = useNavigate();
  const [items, setItems] = useState<StructureListItem[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    structuresApi.list().then(setItems).catch((err: unknown) => setError(errorMessage(err)));
  }, []);

  function set<K extends keyof typeof EMPTY>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problem = validateStructureForm(form);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await structuresApi.create({
        name: form.name.trim(),
        description: form.description.trim() || null,
        width: Number(form.width),
        height: Number(form.height),
        depth: Number(form.depth),
        baseX: Number(form.baseX),
        baseY: Number(form.baseY),
        baseZ: Number(form.baseZ),
      });
      navigate(`/structures/${created.id}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <div className="page-heading">
        <h1>Esquemáticos</h1>
      </div>
      <p className="muted">
        Estructuras propias, independientes de cualquier granja. Defines una coordenada base (la esquina mínima) y, al tocar un bloque, ves dónde debe ir en el mundo.
      </p>

      {items === null ? (
        error ? null : (
          <p className="muted" role="status">
            Cargando esquemáticos…
          </p>
        )
      ) : items.length === 0 ? (
        <div className="empty-state">
          <h2>Todavía no hay esquemáticos</h2>
          <p className="muted">Crea uno desde cero con el formulario de abajo o importa un archivo de Litematica.</p>
        </div>
      ) : (
        <>
          <p className="results-meta muted">{plural(items.length, "esquemático")}</p>
          <ul className="card-list">
            {items.map((s) => (
              <li key={s.id}>
                <Link to={`/structures/${s.id}`} className="card-link">
                  <strong>{s.name}</strong>
                  <span className="muted small">
                    {s.width} × {s.height} × {s.depth} bloques · editado el {dateFormat.format(new Date(s.updatedAtUtc))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <section className="import-box">
        <h2>Importar un archivo</h2>
        <p className="muted">Crea un esquemático editable a partir de un .litematic, .schem o .nbt (se usa la primera región).</p>
        <label className="button" aria-disabled={importing}>
          {importing ? "Importando…" : "Elegir archivo"}
          <input
            disabled={importing}
            type="file"
            className="visually-hidden"
            accept=".litematic,.schem,.nbt"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setError(null);
              setImporting(true);
              try {
                const created = await structuresApi.importFile(file);
                navigate(`/structures/${created.id}`);
              } catch (err) {
                setError(errorMessage(err));
                setImporting(false);
              }
            }}
          />
        </label>
      </section>

      <form className="farm-form narrow" onSubmit={handleCreate} noValidate>
        <h2>Nuevo esquemático</h2>
        <label>
          Nombre *
          <input value={form.name} maxLength={200} onChange={(e) => set("name", e.target.value)} />
        </label>
        <label>
          Descripción
          <input value={form.description} maxLength={4000} onChange={(e) => set("description", e.target.value)} />
        </label>
        <fieldset>
          <legend>Tamaño (bloques, máximo 200 por lado)</legend>
          <div className="dimension-grid">
            <label>Ancho (X)<input inputMode="numeric" value={form.width} onChange={(e) => set("width", e.target.value)} /></label>
            <label>Alto (Y)<input inputMode="numeric" value={form.height} onChange={(e) => set("height", e.target.value)} /></label>
            <label>Profundidad (Z)<input inputMode="numeric" value={form.depth} onChange={(e) => set("depth", e.target.value)} /></label>
          </div>
        </fieldset>
        <fieldset>
          <legend>Coordenada base del mundo (esquina mínima)</legend>
          <div className="dimension-grid">
            <label>X<input inputMode="numeric" value={form.baseX} onChange={(e) => set("baseX", e.target.value)} /></label>
            <label>Y<input inputMode="numeric" value={form.baseY} onChange={(e) => set("baseY", e.target.value)} /></label>
            <label>Z<input inputMode="numeric" value={form.baseZ} onChange={(e) => set("baseZ", e.target.value)} /></label>
          </div>
        </fieldset>
        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}
        <div className="actions">
          <button type="submit" className="button button-primary" disabled={saving}>
            {saving ? "Creando…" : "Crear esquemático"}
          </button>
        </div>
      </form>
    </section>
  );
}
