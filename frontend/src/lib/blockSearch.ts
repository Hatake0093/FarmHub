import type { BlockEntry } from "../api/blocks";

/** Nombre que se muestra: el español si existe, si no el inglés. */
export function blockDisplayName(block: BlockEntry): string {
  return block.spanishName ?? block.englishName;
}

/** Minúsculas, sin tildes y con guiones bajos, guiones y dos puntos tratados como espacios. */
export function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_:-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Busca por nombre en español, inglés o identificador. Ignora tildes y el orden de las palabras
 * ("door oak" encuentra "Oak Door") y ordena por relevancia: nombre exacto, empieza por, empieza una palabra, contiene.
 * Sin texto devuelve los primeros.
 */
export function searchBlocks(blocks: BlockEntry[], term: string, limit = 30): BlockEntry[] {
  const query = normalizeSearch(term);
  if (!query) return blocks.slice(0, limit);
  const tokens = query.split(" ");

  const scored: { block: BlockEntry; score: number; length: number; index: number }[] = [];
  blocks.forEach((block, index) => {
    const names = [block.spanishName, block.englishName, block.id.replace(/^[^:]*:/, "")]
      .filter((n): n is string => !!n)
      .map(normalizeSearch);
    const all = names.join(" ");
    if (!tokens.every((t) => all.includes(t))) return;

    let score = 3;
    if (names.some((n) => n === query)) score = 0;
    else if (names.some((n) => n.startsWith(query))) score = 1;
    else if (tokens.every((t) => names.some((n) => n.split(" ").some((w) => w.startsWith(t))))) score = 2;
    // A igual relevancia, gana el nombre más corto ("Oak Door" antes que "Dark Oak Door").
    scored.push({ block, score, length: Math.min(...names.map((n) => n.length)), index });
  });

  scored.sort((x, y) => x.score - y.score || x.length - y.length || x.index - y.index);
  return scored.slice(0, limit).map((m) => m.block);
}

/** Nombre corto (sin el espacio de nombres), usado en la URL del API. */
export function shortName(id: string): string {
  return id.replace(/^minecraft:/, "");
}
