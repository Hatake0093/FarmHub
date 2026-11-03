import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { structuresApi, type StructureListItem } from "../api/structures";
import { errorMessage } from "../api/client";

const EMPTY = { name: "", description: "", width: "8", height: "4", depth: "8", baseX: "0", baseY: "64", baseZ: "0" };

export function StructuresPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<StructureListItem[]>([]);
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
    if (!form.name.trim()) {
      setError("El nombre es obligatorio.");
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

      {items.length === 0 ? (
        <p className="muted">Todavía no hay esquemáticos.</p>
      ) : (
        <ul className="file-list">
          {items.map((s) => (
            <li key={s.id}>
              <Link to={`/structures/${s.id}`}>{s.name}</Link>{" "}
              <span className="muted">
                {s.width} × {s.height} × {s.depth}
              </span>
            </li>
          ))}
        </ul>
      )}

      <section className="import-box">
        <h2>Importar un archivo</h2>
        <p className="muted">Crea un esquemático editable a partir de un .litematic, .schem o .nbt (se usa la primera región).</p>
        <label className="button">
          Elegir archivo
          <input
            type="file"
            hidden
            accept=".litematic,.schem,.nbt"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setError(null);
              try {
                const created = await structuresApi.importFile(file);
                navigate(`/structures/${created.id}`);
              } catch (err) {
                setError(errorMessage(err));
              }
            }}
          />
        </label>
      </section>

      <form className="farm-form narrow" onSubmit={handleCreate} noValidate>
        <h2>Nuevo esquemático</h2>
        <label>
          Nombre *
          <input value={form.name} onChange={(e) => set("name", e.target.value)} />
        </label>
        <label>
          Descripción
          <input value={form.description} onChange={(e) => set("description", e.target.value)} />
        </label>
        <fieldset>
          <legend>Tamaño (bloques)</legend>
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
        {error && <p className="error" role="alert">{error}</p>}
        <div className="actions">
          <button type="submit" className="button button-primary" disabled={saving}>
            {saving ? "Creando…" : "Crear esquemático"}
          </button>
        </div>
      </form>
    </section>
  );
}
