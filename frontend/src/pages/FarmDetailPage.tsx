import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { farmsApi } from "../api/farms";
import { errorMessage } from "../api/client";
import type { FarmDetail } from "../api/types";
import { difficultyLabel } from "../lib/labels";

export function FarmDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const farmId = Number(id);

  const [farm, setFarm] = useState<FarmDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    farmsApi
      .get(farmId)
      .then((data) => {
        if (active) setFarm(data);
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
  }, [farmId]);

  async function handleDelete() {
    if (!farm) return;
    const confirmed = window.confirm(
      `¿Borrar "${farm.name}"? También se borrarán sus diseños y archivos. Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;

    try {
      await farmsApi.remove(farm.id);
      navigate("/farms");
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (loading) return <p className="muted">Cargando granja…</p>;
  if (error) return <p className="error" role="alert">{error}</p>;
  if (!farm) return null;

  return (
    <article className="farm-detail">
      <div className="page-heading">
        <div>
          <p className="muted">
            <Link to="/farms">Biblioteca</Link> / {farm.category.name}
          </p>
          <h1>{farm.name}</h1>
        </div>
        <div className="actions">
          <Link to={`/farms/${farm.id}/edit`} className="button">
            Editar
          </Link>
          <button type="button" className="button button-danger" onClick={handleDelete}>
            Borrar
          </button>
        </div>
      </div>

      <dl className="facts">
        <div>
          <dt>Categoría</dt>
          <dd>{farm.category.name}</dd>
        </div>
        <div>
          <dt>Dificultad</dt>
          <dd>{difficultyLabel(farm.difficulty)}</dd>
        </div>
        <div>
          <dt>Versiones de Minecraft</dt>
          <dd>{farm.minecraftVersions.map((v) => v.name).join(", ") || "Sin versiones registradas"}</dd>
        </div>
        <div>
          <dt>Etiquetas</dt>
          <dd>
            {farm.tags.length
              ? farm.tags.map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))
              : "—"}
          </dd>
        </div>
      </dl>

      {farm.description && (
        <section>
          <h2>Descripción</h2>
          <p className="description">{farm.description}</p>
        </section>
      )}

      <section>
        <h2>Diseños</h2>
        {farm.designs.length === 0 ? (
          <p className="muted">Esta granja todavía no tiene diseños.</p>
        ) : (
          <ul className="design-list">
            {farm.designs.map((design) => (
              <li key={design.id}>
                {design.name} <span className="muted">({design.fileCount} archivos)</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
