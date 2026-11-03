import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { structuresApi, type StructureListItem } from "../api/structures";
import { errorMessage } from "../api/client";

const EMPTY = { name: "", description: "", width: "8", height: "4", depth: "8", baseX: "0", baseY: "64", baseZ: "0" };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

export function StructuresPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<StructureListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [importing, setImporting] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    structuresApi
      .list()
      .then(setItems)
      .catch((err: unknown) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((s) => s.name.toLowerCase().includes(q) || (s.description ?? "").toLowerCase().includes(q));
  }, [items, query]);

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

  async function handleImport(file: File) {
    setError(null);
    setImporting(true);
    try {
      const created = await structuresApi.importFile(file);
      navigate(`/structures/${created.id}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setImporting(false);
    }
  }

  return (
    <section>
      <div className="page-heading structures-heading">
        <div>
          <h1>Esquemáticos</h1>
          <p className="muted">
            Estructuras propias, independientes de cualquier granja. Defines una coordenada base (la esquina mínima) y, al tocar un bloque, ves dónde debe ir en el mundo.
          </p>
        </div>
        <div className="structures-actions">
          <label className={`button${importing ? " disabled" : ""}`}>
            {importing ? "Importando…" : "Importar archivo"}
            <input
              type="file"
              hidden
              disabled={importing}
              accept=".litematic,.schem,.nbt"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void handleImport(file);
              }}
            />
          </label>
          <button type="button" className="button button-primary" aria-expanded={showForm} onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cerrar" : "Nuevo esquemático"}
          </button>
        </div>
      </div>

      <p className="muted small">Importa .litematic, .schem o .nbt (se usa la primera región).</p>

      {error && <p className="error" role="alert">{error}</p>}

      {showForm && (
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
          <div className="actions">
            <button type="submit" className="button button-primary" disabled={saving}>
              {saving ? "Creando…" : "Crear esquemático"}
            </button>
          </div>
        </form>
      )}

      {items.length > 0 && (
        <div className="filters structures-search">
          <label>
            Buscar
            <input type="search" value={query} placeholder="Nombre o descripción" onChange={(e) => setQuery(e.target.value)} />
          </label>
          <span className="muted small">
            {visible.length} de {items.length}
          </span>
        </div>
      )}

      {loading && <p className="muted">Cargando esquemáticos…</p>}

      {!loading && items.length === 0 && (
        <div className="empty-state">
          <p>Todavía no hay esquemáticos.</p>
          <p className="muted">Crea uno desde cero o importa un archivo de Litematica, Sponge o Minecraft.</p>
        </div>
      )}

      {!loading && items.length > 0 && visible.length === 0 && <p className="muted">Ningún esquemático coincide con la búsqueda.</p>}

      {visible.length > 0 && (
        <ul className="structure-grid">
          {visible.map((s) => (
            <li key={s.id}>
              <Link to={`/structures/${s.id}`} className="structure-card">
                <h3>{s.name}</h3>
                <p className={s.description ? "structure-description" : "structure-description muted"}>
                  {s.description ?? "Sin descripción"}
                </p>
                <div className="structure-meta">
                  <span className="dimension-chip">
                    {s.width} × {s.height} × {s.depth}
                  </span>
                  <span className="muted small">Actualizado {formatDate(s.updatedAtUtc)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
