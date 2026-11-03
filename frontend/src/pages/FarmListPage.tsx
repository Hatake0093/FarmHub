import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { categoriesApi, farmsApi, versionsApi, type FarmListQuery } from "../api/farms";
import { errorMessage } from "../api/client";
import type { Category, Difficulty, FarmSummary, MinecraftVersion, Paged } from "../api/types";
import { DIFFICULTIES, difficultyLabel } from "../lib/labels";
import { plural } from "../lib/plural";
import { useFeedback } from "../lib/feedback";
import { useDocumentTitle } from "../lib/useDocumentTitle";

const PAGE_SIZE = 20;
const FILTER_KEYS = ["q", "categoryId", "difficulty", "tag", "version"] as const;

function readQuery(params: URLSearchParams): FarmListQuery {
  const categoryId = Number(params.get("categoryId"));
  return {
    q: params.get("q") ?? undefined,
    categoryId: categoryId > 0 ? categoryId : undefined,
    difficulty: (params.get("difficulty") as Difficulty | null) ?? undefined,
    tag: params.get("tag") ?? undefined,
    version: params.get("version") ?? undefined,
    page: Math.max(1, Number(params.get("page")) || 1),
    pageSize: PAGE_SIZE,
  };
}

export function FarmListPage() {
  useDocumentTitle("Biblioteca");
  const { confirm } = useFeedback();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchKey = searchParams.toString();
  const query = useMemo(() => readQuery(new URLSearchParams(searchKey)), [searchKey]);

  const [result, setResult] = useState<Paged<FarmSummary> | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [versions, setVersions] = useState<MinecraftVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    categoriesApi.list().then(setCategories).catch(() => setCategories([]));
    versionsApi.list().then(setVersions).catch(() => setVersions([]));
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    farmsApi
      .list(query)
      .then((data) => {
        if (active) setResult(data);
      })
      .catch((err: unknown) => {
        if (active) setError(errorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [query, reloadKey]);

  async function handleDelete(farm: FarmSummary) {
    const accepted = await confirm({
      title: "Borrar granja",
      message: `¿Borrar "${farm.name}" con sus diseños y archivos? No se puede deshacer.`,
      confirmLabel: "Borrar granja",
      danger: true,
    });
    if (!accepted) return;
    setActionError(null);
    try {
      await farmsApi.remove(farm.id);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next = new URLSearchParams();
    for (const key of FILTER_KEYS) {
      const value = String(data.get(key) ?? "").trim();
      if (value) next.set(key, value);
    }
    setSearchParams(next);
  }

  function goToPage(page: number) {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(page));
    setSearchParams(next);
  }

  // Los desplegables filtran al elegir una opción; los campos de texto, al pulsar Intro o "Filtrar".
  function applyOnSelectChange(event: ChangeEvent<HTMLFormElement>) {
    if (event.target instanceof HTMLSelectElement) event.currentTarget.requestSubmit();
  }

  const hasFilters = FILTER_KEYS.some((key) => searchParams.has(key));
  const totalPages = result ? Math.max(1, Math.ceil(result.totalCount / result.pageSize)) : 1;
  const currentPage = query.page ?? 1;

  return (
    <section>
      <div className="page-heading">
        <h1>Biblioteca de granjas</h1>
      </div>

      <form key={searchKey} className="filters" onSubmit={applyFilters} onChange={applyOnSelectChange} role="search">
        <label>
          Nombre
          <input name="q" type="search" defaultValue={query.q ?? ""} placeholder="Buscar…" />
        </label>
        <label>
          Categoría
          <select name="categoryId" defaultValue={query.categoryId ?? ""}>
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Dificultad
          <select name="difficulty" defaultValue={query.difficulty ?? ""}>
            <option value="">Todas</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {difficultyLabel(d)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Etiqueta
          <input name="tag" defaultValue={query.tag ?? ""} placeholder="p. ej. mobs" />
        </label>
        <label>
          Versión
          <select name="version" defaultValue={query.version ?? ""}>
            <option value="">Todas</option>
            {versions.map((v) => (
              <option key={v.id} value={v.name}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
        <div className="filters-actions">
          <button type="submit" className="button button-primary">
            Filtrar
          </button>
          <Link to="/farms" className="button">
            Limpiar
          </Link>
        </div>
      </form>

      {loading && !result && (
        <p className="muted" role="status">
          Cargando granjas…
        </p>
      )}
      {error && (
        <p className="alert" role="alert">
          {error}{" "}
          <button type="button" className="button-link" onClick={() => setReloadKey((k) => k + 1)}>
            Reintentar
          </button>
        </p>
      )}
      {actionError && <p className="alert" role="alert">{actionError}</p>}

      {!error && result && result.items.length === 0 && !loading && (
        hasFilters ? (
          <div className="empty-state">
            <h2>Sin resultados</h2>
            <p className="muted">No hay granjas que coincidan con los filtros.</p>
            <Link to="/farms" className="button">
              Quitar filtros
            </Link>
          </div>
        ) : (
          <div className="empty-state">
            <h2>Tu biblioteca está vacía</h2>
            <p className="muted">Crea tu primera granja para guardar su ficha técnica, producciones y diseños.</p>
            <Link to="/farms/new" className="button button-primary">
              Crear la primera granja
            </Link>
          </div>
        )
      )}

      {!error && result && result.items.length > 0 && (
        <div aria-busy={loading} className={loading ? "is-refreshing" : undefined}>
          <p className="results-meta muted">{plural(result.totalCount, "granja")}</p>
          <table className="farm-table">
            <thead>
              <tr>
                <th>Granja</th>
                <th>Categoría</th>
                <th>Dificultad</th>
                <th>Versiones</th>
                <th>Etiquetas</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {result.items.map((farm) => (
                <tr key={farm.id}>
                  <td>
                    <Link to={`/farms/${farm.id}`}>{farm.name}</Link>
                  </td>
                  <td>{farm.categoryName}</td>
                  <td>{difficultyLabel(farm.difficulty)}</td>
                  <td>{farm.minecraftVersions.join(", ") || "—"}</td>
                  <td>
                    {farm.tags.map((tag) => (
                      <span key={tag} className="tag">
                        {tag}
                      </span>
                    ))}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="button-link button-danger"
                      aria-label={`Borrar ${farm.name}`}
                      onClick={() => void handleDelete(farm)}
                    >
                      Borrar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <nav className="pagination" aria-label="Paginación">
            <button type="button" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}>
              Anterior
            </button>
            <span>
              Página {currentPage} de {totalPages} ({plural(result.totalCount, "granja")})
            </span>
            <button type="button" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages}>
              Siguiente
            </button>
          </nav>
        </div>
      )}
    </section>
  );
}
