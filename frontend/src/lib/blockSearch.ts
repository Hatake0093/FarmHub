import type { BlockEntry } from "../api/blocks";

/** Nombre que se muestra: el español si existe, si no el inglés. */
export function blockDisplayName(block: BlockEntry): string {
  return block.spanishName ?? block.englishName;
}

/** Busca por nombre en español, inglés o identificador. Sin texto devuelve los primeros. */
export function searchBlocks(blocks: BlockEntry[], term: string, limit = 30): BlockEntry[] {
  const t = term.trim().toLowerCase();
  const matches = t
    ? blocks.filter(
        (b) =>
          b.id.toLowerCase().includes(t) ||
          b.englishName.toLowerCase().includes(t) ||
          (b.spanishName?.toLowerCase().includes(t) ?? false),
      )
    : blocks;
  return matches.slice(0, limit);
}

/** Nombre corto (sin el espacio de nombres), usado en la URL del API. */
export function shortName(id: string): string {
  return id.replace(/^minecraft:/, "");
}
