import type { BlockEntry } from "../api/blocks";
import { blockDisplayName, searchBlocks } from "./blockSearch";

export const RECENT_LIMIT = 8;
const STORAGE_KEY = "farmhub.recentBlocks";

/** Añade un bloque al principio de los recientes, sin repetirlo y con límite. */
export function pushRecent(recent: string[], id: string, limit = RECENT_LIMIT): string[] {
  return [id, ...recent.filter((r) => r !== id)].slice(0, limit);
}

/** Recientes que todavía existen en el catálogo, en orden. */
export function resolveRecent(catalog: BlockEntry[], recentIds: string[]): BlockEntry[] {
  const byId = new Map(catalog.map((b) => [b.id, b]));
  return recentIds.map((id) => byId.get(id)).filter((b): b is BlockEntry => b !== undefined);
}

/** Lee los recientes guardados en este navegador. Si no se puede leer, devuelve lista vacía. */
export function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string").slice(0, RECENT_LIMIT) : [];
  } catch {
    return [];
  }
}

export function writeRecent(recent: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
  } catch {
    // Sin almacenamiento disponible, los recientes simplemente no se guardan.
  }
}

/** Texto de cada opción: nombre en español o inglés. */
export function optionLabel(block: BlockEntry): string {
  return blockDisplayName(block);
}

/** Opciones visibles: con texto de búsqueda, resultados; sin texto, los recientes primero. */
export function visibleOptions(catalog: BlockEntry[], query: string, recentIds: string[]): BlockEntry[] {
  if (query.trim()) return searchBlocks(catalog, query, 200);
  const recent = resolveRecent(catalog, recentIds);
  const recentSet = new Set(recent.map((b) => b.id));
  return [...recent, ...catalog.filter((b) => !recentSet.has(b.id))].slice(0, 200);
}
