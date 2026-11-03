import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { farmsApi } from "../api/farms";
import { errorMessage } from "../api/client";
import type { FarmDetail } from "../api/types";
import { difficultyLabel } from "../lib/labels";
import { DesignSection } from "../components/DesignSection";
import { FarmSheetSections } from "../components/FarmSheetSections";
import { formatDimensions } from "../lib/format";
import { useDocumentTitle } from "../lib/useDocumentTitle";

export function FarmDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const farmId = Number(id);

  const [farm, setFarm] = useState<FarmDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Un fallo al borrar no debe tapar la ficha: se muestra aparte, sobre ella.
  const [deleteError, setDeleteError] = useState<string | null>(null);
  useDocumentTitle(farm?.id === farmId ? farm.name : "Granja");

  const loadFarm = useCallback(() => {
    let active = true;
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

  useEffect(() => loadFarm(), [loadFarm]);

  async function handleDelete() {
    if (!farm) return;
    const confirmed = window.confirm(
      `¿Borrar "${farm.name}"? También se borrarán sus diseños y archivos. Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;

    setDeleteError(null);
    try {
      await farmsApi.remove(farm.id);
      navigate("/farms");
    } catch (err) {
      setDeleteError(errorMessage(err));
    }
  }

  if (error)
    return (
      <div className="empty-state">
        <p className="alert" role="alert">
          {error}
        </p>
        <div className="actions">
          <button type="button" className="button" onClick={() => { setLoading(true); loadFarm(); }}>
            Reintentar
          </button>
          <Link to="/farms" className="button">
            Volver a la biblioteca
          </Link>
        </div>
      </div>
    );
  // Evita mostrar una granja anterior mientras se carga la nueva.
  if (loading || !farm || farm.id !== farmId)
    return (
      <p className="muted" role="status">
        Cargando granja…
      </p>
    );

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
          <button type="button" className="button button-danger" onClick={() => void handleDelete()}>
            Borrar
          </button>
        </div>
      </div>

      {deleteError && (
        <p className="alert" role="alert">
          {deleteError}
        </p>
      )}

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
          <dt>Dimensiones (X × Y × Z)</dt>
          <dd>{formatDimensions(farm.widthX, farm.heightY, farm.depthZ) ?? "No indicadas"} {farm.widthX !== null || farm.heightY !== null || farm.depthZ !== null ? "bloques" : ""}</dd>
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

      {farm.operatingConditions && (
        <section>
          <h2>Condiciones de funcionamiento</h2>
          <p className="description">{farm.operatingConditions}</p>
        </section>
      )}

      <DesignSection farmId={farm.id} designs={farm.designs} onChanged={loadFarm} />

      <FarmSheetSections farm={farm} onChanged={loadFarm} />
    </article>
  );
}
