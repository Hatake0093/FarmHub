export interface PickedFile {
  name: string;
}

export interface TextureMatch<T extends PickedFile> {
  file: T;
  blockId: string;
}

/**
 * Empareja archivos con bloques por nombre: "stone.png" -> "minecraft:stone".
 * Ignora la carpeta y la extensión; los que no tienen bloque se devuelven aparte.
 */
export function matchTextureFiles<T extends PickedFile>(
  files: T[],
  blockIds: Set<string>,
): { matched: TextureMatch<T>[]; unmatched: T[] } {
  const matched: TextureMatch<T>[] = [];
  const unmatched: T[] = [];
  for (const file of files) {
    const base = file.name.split("/").pop() ?? file.name;
    const dot = base.lastIndexOf(".");
    const name = (dot > 0 ? base.slice(0, dot) : base).toLowerCase();
    const blockId = `minecraft:${name}`;
    if (blockIds.has(blockId)) {
      matched.push({ file, blockId });
    } else {
      unmatched.push(file);
    }
  }
  return { matched, unmatched };
}
