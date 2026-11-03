import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError, errorMessage } from "../api/client";
import { categoriesApi, farmsApi, versionsApi } from "../api/farms";
import type { Category, Difficulty, FarmInput, MinecraftVersion } from "../api/types";
import { DIFFICULTIES, difficultyLabel } from "../lib/labels";
import { parseTags } from "../lib/tags";

const MAX_NAME_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 4000;

type FieldErrors = Record<string, string[]>;

interface FormState {
  name: string;
  description: string;
  difficulty: Difficulty;
  categoryId: string;
  versionIds: number[];
  tagsText: string;
  widthX: string;
  heightY: string;
  depthZ: string;
  operatingConditions: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  difficulty: "Easy",
  categoryId: "",
  versionIds: [],
  tagsText: "",
  widthX: "",
  heightY: "",
  depthZ: "",
  operatingConditions: "",
};

const MAX_DIMENSION = 10000;

function parseDimension(value: string): number | null {
  return value.trim() === "" ? null : Number(value);
}

function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {};
  const name = form.name.trim();

  if (!name) {
    errors.name = ["El nombre es obligatorio."];
  } else if (name.length > MAX_NAME_LENGTH) {
    errors.name = [`El nombre no puede superar ${MAX_NAME_LENGTH} caracteres.`];
  }
  if (form.description.length > MAX_DESCRIPTION_LENGTH) {
    errors.description = [`La descripción no puede superar ${MAX_DESCRIPTION_LENGTH} caracteres.`];
  }
  if (!form.categoryId) {
    errors.categoryId = ["Selecciona una categoría."];
  }
  for (const [field, value] of [["widthX", form.widthX], ["heightY", form.heightY], ["depthZ", form.depthZ]] as const) {
    const size = parseDimension(value);
    if (size !== null && (!Number.isInteger(size) || size < 1 || size > MAX_DIMENSION)) {
      errors[field] = [`Debe ser un número entero entre 1 y ${MAX_DIMENSION}.`];
    }
  }
  if (form.operatingConditions.length > MAX_DESCRIPTION_LENGTH) {
    errors.operatingConditions = [`No puede superar ${MAX_DESCRIPTION_LENGTH} caracteres.`];
  }
  return errors;
}

function FieldError({ errors, field }: { errors: FieldErrors; field: string }) {
  const messages = errors[field];
  return messages ? <span className="field-error">{messages.join(" ")}</span> : null;
}

export function FarmFormPage() {
  const { id } = useParams();
  const editing = id !== undefined;
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [versions, setVersions] = useState<MinecraftVersion[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    categoriesApi.list().then((data) => active && setCategories(data)).catch(() => undefined);
    versionsApi.list().then((data) => active && setVersions(data)).catch(() => undefined);

    if (editing) {
      farmsApi
        .get(Number(id))
        .then((farm) => {
          if (!active) return;
          setForm({
            name: farm.name,
            description: farm.description ?? "",
            difficulty: farm.difficulty,
            categoryId: String(farm.category.id),
            versionIds: farm.minecraftVersions.map((v) => v.id),
            tagsText: farm.tags.join(", "),
            widthX: farm.widthX?.toString() ?? "",
            heightY: farm.heightY?.toString() ?? "",
            depthZ: farm.depthZ?.toString() ?? "",
            operatingConditions: farm.operatingConditions ?? "",
          });
        })
        .catch((err: unknown) => active && setFormError(errorMessage(err)))
        .finally(() => active && setLoading(false));
    }

    return () => {
      active = false;
    };
  }, [editing, id]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleVersion(versionId: number, checked: boolean) {
    update(
      "versionIds",
      checked ? [...form.versionIds, versionId] : form.versionIds.filter((v) => v !== versionId),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const errors = validate(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const input: FarmInput = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      difficulty: form.difficulty,
      categoryId: Number(form.categoryId),
      minecraftVersionIds: form.versionIds,
      tags: parseTags(form.tagsText),
      widthX: parseDimension(form.widthX),
      heightY: parseDimension(form.heightY),
      depthZ: parseDimension(form.depthZ),
      operatingConditions: form.operatingConditions.trim() || null,
    };

    setSaving(true);
    try {
      const saved = editing
        ? await farmsApi.update(Number(id), input)
        : await farmsApi.create(input);
      navigate(`/farms/${saved.id}`);
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) {
        setFieldErrors(err.fieldErrors);
      }
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="muted">Cargando granja…</p>;

  return (
    <section className="narrow">
      <div className="page-heading">
        <h1>{editing ? "Editar granja" : "Nueva granja"}</h1>
      </div>

      <form className="farm-form" onSubmit={handleSubmit} noValidate>
        <label htmlFor="name">
          Nombre *
          <input
            id="name"
            value={form.name}
            maxLength={MAX_NAME_LENGTH + 50}
            onChange={(e) => update("name", e.target.value)}
          />
          <FieldError errors={fieldErrors} field="name" />
        </label>

        <label htmlFor="categoryId">
          Categoría *
          <select id="categoryId" value={form.categoryId} onChange={(e) => update("categoryId", e.target.value)}>
            <option value="">Selecciona una categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <FieldError errors={fieldErrors} field="categoryId" />
          {categories.length === 0 && (
            <span className="muted">No hay categorías. Créalas desde la API antes de añadir granjas.</span>
          )}
        </label>

        <label htmlFor="difficulty">
          Dificultad
          <select
            id="difficulty"
            value={form.difficulty}
            onChange={(e) => update("difficulty", e.target.value as Difficulty)}
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {difficultyLabel(d)}
              </option>
            ))}
          </select>
        </label>

        <fieldset>
          <legend>Versiones de Minecraft Java</legend>
          {versions.length === 0 && <span className="muted">No hay versiones registradas.</span>}
          <div className="checkbox-grid">
            {versions.map((v) => (
              <label key={v.id} className="checkbox">
                <input
                  type="checkbox"
                  checked={form.versionIds.includes(v.id)}
                  onChange={(e) => toggleVersion(v.id, e.target.checked)}
                />
                {v.name}
              </label>
            ))}
          </div>
          <FieldError errors={fieldErrors} field="minecraftVersionIds" />
        </fieldset>

        <label htmlFor="tags">
          Etiquetas (separadas por comas)
          <input
            id="tags"
            value={form.tagsText}
            placeholder="mobs, xp, automática"
            onChange={(e) => update("tagsText", e.target.value)}
          />
          <FieldError errors={fieldErrors} field="tags" />
        </label>

        <fieldset>
          <legend>Dimensiones del montaje (bloques)</legend>
          <div className="dimension-grid">
            <label htmlFor="widthX">
              Ancho (X)
              <input id="widthX" inputMode="numeric" value={form.widthX} onChange={(e) => update("widthX", e.target.value)} />
              <FieldError errors={fieldErrors} field="widthX" />
            </label>
            <label htmlFor="heightY">
              Alto (Y)
              <input id="heightY" inputMode="numeric" value={form.heightY} onChange={(e) => update("heightY", e.target.value)} />
              <FieldError errors={fieldErrors} field="heightY" />
            </label>
            <label htmlFor="depthZ">
              Profundidad (Z)
              <input id="depthZ" inputMode="numeric" value={form.depthZ} onChange={(e) => update("depthZ", e.target.value)} />
              <FieldError errors={fieldErrors} field="depthZ" />
            </label>
          </div>
        </fieldset>

        <label htmlFor="operatingConditions">
          Condiciones de funcionamiento
          <textarea
            id="operatingConditions"
            rows={3}
            placeholder="p. ej. requiere agua en movimiento, iluminación exterior"
            value={form.operatingConditions}
            onChange={(e) => update("operatingConditions", e.target.value)}
          />
          <FieldError errors={fieldErrors} field="operatingConditions" />
        </label>

        <label htmlFor="description">
          Descripción
          <textarea
            id="description"
            rows={5}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
          />
          <FieldError errors={fieldErrors} field="description" />
        </label>

        {formError && <p className="error" role="alert">{formError}</p>}

        <div className="actions">
          <button type="submit" className="button button-primary" disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
          <Link to={editing ? `/farms/${id}` : "/farms"} className="button">
            Cancelar
          </Link>
        </div>
      </form>
    </section>
  );
}
