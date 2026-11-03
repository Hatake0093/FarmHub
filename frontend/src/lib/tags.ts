/** Separa un texto "a, b, a" en etiquetas únicas y sin espacios sobrantes. */
export function parseTags(input: string): string[] {
  const tags = new Set<string>();
  for (const raw of input.split(",")) {
    const tag = raw.trim();
    if (tag) {
      tags.add(tag);
    }
  }
  return [...tags];
}
