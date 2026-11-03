import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { categoriesApi, farmsApi, versionsApi, type FarmListQuery } from "../api/farms";
import { errorMessage } from "../api/client";
import type { Category, Difficulty, FarmSummary, MinecraftVersion, Paged } from "../api/types";
import { DIFFICULTIES, difficultyLabel } from "../lib/labels";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const searchKey = searchParams.toString();
  const query = useMemo(() => readQuery(new URLSearchParams(searchKey)), [searchKey]);

  const [result, setResult] = useState<Paged<FarmSummary> | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [versions, setVersions] = useState<MinecraftVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  }, [query]);

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

  const totalPages = result ? Math.max(1, Math.ceil(result.totalCount / result.pageSize)) : 1;
  const currentPage = query.page ?? 1;

  return (
    <section>
      <div className="page-heading">
        <h1>Biblioteca de granjas</h1>
      </div>

      <form key={searchKey} className="filters" onSubmit={applyFilters} role="search">
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

      {loading && <p className="muted">Cargando granjas…</p>}
      {error && <p className="error" role="alert">{error}</p>}

      {!loading && !error && result && result.items.length === 0 && (
        <p className="muted">No hay granjas que coincidan con los filtros.</p>
      )}

      {!loading && !error && result && result.items.length > 0 && (
        <>
          <table className="farm-table">
            <thead>
              <tr>
                <th>Granja</th>
                <th>Categoría</th>
                <th>Dificultad</th>
                <th>Versiones</th>
                <th>Etiquetas</th>
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
                </tr>
              ))}
            </tbody>
          </table>

          <nav className="pagination" aria-label="Paginación">
            <button type="button" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}>
              Anterior
            </button>
            <span>
              Página {currentPage} de {totalPages} ({result.totalCount} granjas)
            </span>
            <button type="button" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages}>
              Siguiente
            </button>
          </nav>
        </>
      )}
    </section>
  );
}
