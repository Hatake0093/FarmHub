import { useEffect, useMemo, useState, type FormEvent } from "react";
import { itemsApi, type ItemEntry } from "../api/items";
import { errorMessage } from "../api/client";
import { shortName } from "../lib/blockSearch";
import { ColorField } from "./BlocksPage";

/** Catálogo de items. Se pueden añadir nuevos con su identificador; el nombre en español y el color son editables. */
export function ItemsPage() {
  const [items, setItems] = useState<ItemEntry[]>([]);
  const [search, setSearch] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, { name: string; color: string | null }>>({});
  const [newId, setNewId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  function load() {
    itemsApi.list().then(setItems).catch((err: unknown) => setError(errorMessage(err)));
  }

  useEffect(load, []);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((i) => {
      if (onlyMissing && i.spanishName) return false;
      if (!term) return true;
      return (
        i.id.toLowerCase().includes(term) ||
        i.englishName.toLowerCase().includes(term) ||
        (i.spanishName?.toLowerCase().includes(term) ?? false)
      );
    });
  }, [items, search, onlyMissing]);

  function draftOf(item: ItemEntry) {
    return drafts[item.id] ?? { name: item.spanishName ?? "", color: item.color };
  }

  function setDraft(item: ItemEntry, patch: Partial<{ name: string; color: string | null }>) {
    setDrafts((current) => ({ ...current, [item.id]: { ...draftOf(item), ...patch } }));
  }

  async function save(item: ItemEntry) {
    const draft = draftOf(item);
    setSavingId(item.id);
    setError(null);
    try {
      const updated = await itemsApi.update(shortName(item.id), draft.name.trim() || null, draft.color);
      setItems((current) => current.map((i) => (i.id === updated.id ? updated : i)));
      setDrafts((current) => {
        const copy = { ...current };
        delete copy[item.id];
        return copy;
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSavingId(null);
    }
  }

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await itemsApi.add(newId.trim());
      setNewId("");
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const missingCount = items.filter((i) => !i.spanishName).length;

  return (
    <section>
      <div className="page-heading">
        <h1>Catálogo de items</h1>
        <span className="muted">{items.length - missingCount} de {items.length} con nombre en español</span>
      </div>
      <p className="muted">Items de Minecraft con su nombre en español y el color con el que se ven en los visores. Puedes añadir items nuevos abajo.</p>

      <div className="filters">
        <label>
          Buscar
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Español, inglés o id" />
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} />
          Solo los que faltan
        </label>
      </div>

      {error && <p className="error" role="alert">{error}</p>}

      <table className="farm-table">
        <thead>
          <tr>
            <th>Inglés</th>
            <th>Identificador</th>
            <th>Nombre en español</th>
            <th>Color</th>
            <th aria-label="Acciones" />
          </tr>
        </thead>
        <tbody>
          {visible.map((item) => {
            const draft = draftOf(item);
            return (
              <tr key={item.id}>
                <td>{item.englishName}</td>
                <td className="muted">{item.id}</td>
                <td>
                  <input
                    aria-label={`Nombre en español de ${item.englishName}`}
                    value={draft.name}
                    onChange={(e) => setDraft(item, { name: e.target.value })}
                  />
                </td>
                <td>
                  <ColorField
                    label={`Color de ${item.englishName}`}
                    value={draft.color}
                    onChange={(color) => setDraft(item, { color })}
                  />
                </td>
                <td>
                  <button type="button" className="button" disabled={savingId === item.id} onClick={() => void save(item)}>
                    {savingId === item.id ? "Guardando…" : "Guardar"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <form className="inline-form" onSubmit={handleAdd} noValidate>
        <input
          aria-label="Identificador del nuevo item"
          placeholder="Nuevo item, p. ej. netherite_sword"
          value={newId}
          onChange={(e) => setNewId(e.target.value)}
        />
        <button type="submit" className="button button-primary">Añadir item</button>
      </form>
    </section>
  );
}
