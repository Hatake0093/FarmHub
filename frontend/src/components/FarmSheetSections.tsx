import { useEffect, useState, type FormEvent } from "react";
import { dependenciesApi, farmStructuresApi, linksApi, productionsApi } from "../api/sheet";
import { structuresApi, type StructureListItem } from "../api/structures";
import { Link } from "react-router-dom";
import { farmsApi, versionsApi } from "../api/farms";
import { errorMessage } from "../api/client";
import type {
  FarmDetail,
  FarmLink,
  FarmProduction,
  FarmRelation,
  LinkKind,
  MinecraftVersion,
  ProductionUnit,
} from "../api/types";
import { formatAmount } from "../lib/format";
import { isHttpUrl } from "../lib/url";

interface Props {
  farm: FarmDetail;
  onChanged: () => void;
}

function useAction(onChanged: () => void) {
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return { error, run, setError };
}

export function FarmSheetSections({ farm, onChanged }: Props) {
  return (
    <>
      <StructuresSection farmId={farm.id} linked={farm.structures} onChanged={onChanged} />
      <LinksSection farmId={farm.id} links={farm.links} onChanged={onChanged} />
      <ProductionsSection farmId={farm.id} productions={farm.productions} onChanged={onChanged} />
      <DependenciesSection farm={farm} onChanged={onChanged} />
    </>
  );
}

/* ---------- Esquemáticos vinculados ---------- */

function StructuresSection({
  farmId,
  linked,
  onChanged,
}: {
  farmId: number;
  linked: FarmDetail["structures"];
  onChanged: () => void;
}) {
  const [available, setAvailable] = useState<StructureListItem[]>([]);
  const [choice, setChoice] = useState("");
  const { error, run, setError } = useAction(onChanged);

  useEffect(() => {
    structuresApi.list().then(setAvailable).catch(() => setAvailable([]));
  }, [linked]);

  const linkedIds = new Set(linked.map((s) => s.id));
  const candidates = available.filter((s) => !linkedIds.has(s.id));

  async function handleLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!choice) {
      setError("Selecciona un esquemático.");
      return;
    }
    await run(() => farmStructuresApi.link(farmId, Number(choice)));
    setChoice("");
  }

  return (
    <section>
      <h2>Esquemáticos vinculados</h2>
      <p className="muted">Estructuras propias usadas en esta granja. Desvincular no borra el esquemático.</p>
      {linked.length === 0 && <p className="muted">No hay esquemáticos vinculados.</p>}
      <ul className="file-list">
        {linked.map((s) => (
          <li key={s.id}>
            <Link to={`/structures/${s.id}`}>{s.name}</Link>{" "}
            <span className="muted">
              {s.width} × {s.height} × {s.depth} · {s.blockCount} bloques
            </span>{" "}
            <button
              type="button"
              className="button-link button-danger"
              aria-label={`Desvincular ${s.name}`}
              onClick={() => {
                if (window.confirm(`¿Desvincular "${s.name}" de esta granja?`)) {
                  void run(() => farmStructuresApi.unlink(farmId, s.id));
                }
              }}
            >
              Desvincular
            </button>
          </li>
        ))}
      </ul>

      <form className="inline-form" onSubmit={handleLink} noValidate>
        <select aria-label="Esquemático a vincular" value={choice} onChange={(e) => setChoice(e.target.value)}>
          <option value="">Elegir esquemático…</option>
          {candidates.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <button type="submit" className="button">Vincular</button>
        <Link to="/structures">Crear esquemático nuevo</Link>
      </form>
      {error && <p className="alert" role="alert">{error}</p>}
    </section>
  );
}

/* ---------- Enlaces y tutoriales ---------- */

const LINK_KIND_LABELS: Record<LinkKind, string> = { Tutorial: "Tutorial", Reference: "Referencia" };

function LinksSection({ farmId, links, onChanged }: { farmId: number; links: FarmLink[]; onChanged: () => void }) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState<LinkKind>("Tutorial");
  const { error, run, setError } = useAction(onChanged);

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !url.trim()) {
      setError("El título y la URL son obligatorios.");
      return;
    }
    if (!isHttpUrl(url.trim())) {
      setError("La URL debe empezar por http:// o https://.");
      return;
    }
    await run(() => linksApi.add(farmId, { title: title.trim(), url: url.trim(), kind }));
    setTitle("");
    setUrl("");
  }

  return (
    <section>
      <h2>Tutoriales y referencias</h2>
      {links.length === 0 && <p className="muted">No hay enlaces todavía.</p>}
      <ul className="file-list">
        {links.map((link) => (
          <li key={link.id}>
            <a href={link.url} target="_blank" rel="noopener noreferrer">
              {link.title}
            </a>{" "}
            <span className="muted">({LINK_KIND_LABELS[link.kind]})</span>{" "}
            <button
              type="button"
              className="button-link button-danger"
              aria-label={`Quitar el enlace ${link.title}`}
              onClick={() => {
                if (window.confirm(`¿Quitar el enlace "${link.title}"?`)) {
                  void run(() => linksApi.remove(link.id));
                }
              }}
            >
              Quitar
            </button>
          </li>
        ))}
      </ul>

      <form className="inline-form" onSubmit={handleAdd} noValidate>
        <input aria-label="Título del enlace" placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input aria-label="URL del enlace" type="url" inputMode="url" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
        <select aria-label="Tipo de enlace" value={kind} onChange={(e) => setKind(e.target.value as LinkKind)}>
          <option value="Tutorial">Tutorial</option>
          <option value="Reference">Referencia</option>
        </select>
        <button type="submit" className="button">Añadir enlace</button>
      </form>
      {error && <p className="alert" role="alert">{error}</p>}
    </section>
  );
}

/* ---------- Producciones por hora ---------- */

const UNIT_LABELS: Record<ProductionUnit, string> = { Items: "ítems", Stacks: "stacks" };

function ProductionsSection({
  farmId,
  productions,
  onChanged,
}: {
  farmId: number;
  productions: FarmProduction[];
  onChanged: () => void;
}) {
  const [versions, setVersions] = useState<MinecraftVersion[]>([]);
  const [resource, setResource] = useState("");
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState<ProductionUnit>("Items");
  const [requiresAfk, setRequiresAfk] = useState(false);
  const [conditions, setConditions] = useState("");
  const [source, setSource] = useState("");
  const [versionId, setVersionId] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const { error, run } = useAction(onChanged);

  useEffect(() => {
    versionsApi.list().then(setVersions).catch(() => setVersions([]));
  }, []);

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(amount.replace(",", "."));
    if (!resource.trim()) {
      setLocalError("Indica el recurso producido.");
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      setLocalError("La producción por hora debe ser un número mayor que 0.");
      return;
    }
    setLocalError(null);

    await run(() =>
      productionsApi.add(farmId, {
        resourceName: resource.trim(),
        amountPerHour: value,
        unit,
        requiresAfk,
        measurementConditions: conditions.trim() || null,
        source: source.trim() || null,
        measuredInVersionId: versionId ? Number(versionId) : null,
      }),
    );
    setResource("");
    setAmount("");
    setConditions("");
    setSource("");
  }

  return (
    <section>
      <h2>Producción por hora</h2>
      <p className="muted">Son estimaciones válidas solo bajo las condiciones de medición indicadas.</p>

      {productions.length === 0 ? (
        <p className="muted">No hay producciones registradas.</p>
      ) : (
        <table className="farm-table">
          <thead>
            <tr>
              <th>Recurso</th>
              <th>Por hora</th>
              <th>AFK</th>
              <th>Medido en</th>
              <th>Condiciones y fuente</th>
              <th aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            {productions.map((p) => (
              <tr key={p.id}>
                <td data-label="Recurso">{p.resourceName}</td>
                <td data-label="Por hora">
                  {formatAmount(p.amountPerHour)} {UNIT_LABELS[p.unit]}/h
                </td>
                <td data-label="AFK">{p.requiresAfk ? "Sí" : "No"}</td>
                <td data-label="Medido en">{p.measuredInVersion ?? "—"}</td>
                <td data-label="Condiciones y fuente">
                  {p.measurementConditions && <div>{p.measurementConditions}</div>}
                  {p.source && <div className="muted">Fuente: {p.source}</div>}
                  {!p.measurementConditions && !p.source && "—"}
                </td>
                <td>
                  <button
                    type="button"
                    className="button-link button-danger"
                    aria-label={`Borrar la producción de ${p.resourceName}`}
                    onClick={() => {
                      if (window.confirm(`¿Borrar la producción de "${p.resourceName}"?`)) {
                        void run(() => productionsApi.remove(p.id));
                      }
                    }}
                  >
                    Borrar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form className="farm-form-grid" onSubmit={handleAdd} noValidate>
        <h3>Añadir producción</h3>
        <label>
          Recurso *
          <input value={resource} required placeholder="p. ej. Hierro" onChange={(e) => setResource(e.target.value)} />
        </label>
        <label>
          Cantidad por hora *
          <input inputMode="decimal" required placeholder="p. ej. 1200" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label>
          Unidad
          <select value={unit} onChange={(e) => setUnit(e.target.value as ProductionUnit)}>
            <option value="Items">Ítems</option>
            <option value="Stacks">Stacks</option>
          </select>
        </label>
        <label>
          Versión de medición
          <select value={versionId} onChange={(e) => setVersionId(e.target.value)}>
            <option value="">No indicada</option>
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={requiresAfk} onChange={(e) => setRequiresAfk(e.target.checked)} />
          Requiere jugador AFK
        </label>
        <label>
          Condiciones de medición
          <input
            placeholder="p. ej. distancia 64 bloques, sin mobs cercanos"
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
          />
        </label>
        <label>
          Fuente
          <input placeholder="p. ej. medición propia, enlace al vídeo" value={source} onChange={(e) => setSource(e.target.value)} />
        </label>
        <div className="actions">
          <button type="submit" className="button button-primary">Añadir producción</button>
        </div>
        {(localError || error) && <p className="alert" role="alert">{localError ?? error}</p>}
      </form>
    </section>
  );
}

/* ---------- Dependencias ---------- */

function DependenciesSection({ farm, onChanged }: { farm: FarmDetail; onChanged: () => void }) {
  const [farms, setFarms] = useState<{ id: number; name: string }[]>([]);
  const [requiredId, setRequiredId] = useState("");
  const [note, setNote] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const { error, run } = useAction(onChanged);

  useEffect(() => {
    farmsApi
      .list({ pageSize: 100 })
      .then((page) => setFarms(page.items.map((f) => ({ id: f.id, name: f.name }))))
      .catch(() => setFarms([]));
  }, []);

  const alreadyRequired = new Set(farm.requires.map((r) => r.farmId));
  const candidates = farms.filter((f) => f.id !== farm.id && !alreadyRequired.has(f.id));

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requiredId) {
      setLocalError("Selecciona la granja requerida.");
      return;
    }
    setLocalError(null);
    await run(() => dependenciesApi.add(farm.id, Number(requiredId), note.trim() || null));
    setRequiredId("");
    setNote("");
  }

  return (
    <section>
      <h2>Dependencias</h2>

      <h3>Necesita</h3>
      <RelationList
        relations={farm.requires}
        emptyText="Esta granja no depende de otras."
        onRemove={(r) => run(() => dependenciesApi.remove(r.dependencyId))}
      />

      <h3>Es requerida por</h3>
      <RelationList relations={farm.requiredBy} emptyText="Ninguna granja depende de esta todavía." />

      <form className="inline-form" onSubmit={handleAdd} noValidate>
        <select aria-label="Granja requerida" value={requiredId} onChange={(e) => setRequiredId(e.target.value)}>
          <option value="">Granja requerida…</option>
          {candidates.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <input aria-label="Nota de la dependencia" placeholder="Nota (p. ej. hierro para los raíles)" value={note} onChange={(e) => setNote(e.target.value)} />
        <button type="submit" className="button">Añadir dependencia</button>
      </form>
      {(localError || error) && <p className="alert" role="alert">{localError ?? error}</p>}
    </section>
  );
}

function RelationList({
  relations,
  emptyText,
  onRemove,
}: {
  relations: FarmRelation[];
  emptyText: string;
  onRemove?: (relation: FarmRelation) => void;
}) {
  if (relations.length === 0) return <p className="muted">{emptyText}</p>;

  return (
    <ul className="file-list">
      {relations.map((r) => (
        <li key={r.dependencyId}>
          <Link to={`/farms/${r.farmId}`}>{r.farmName}</Link>
          {r.note && <span className="muted"> — {r.note}</span>}{" "}
          {onRemove && (
            <button
              type="button"
              className="button-link button-danger"
              aria-label={`Quitar la dependencia de ${r.farmName}`}
              onClick={() => onRemove(r)}
            >
              Quitar
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
