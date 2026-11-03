import type { TextureFace } from "./blockFaces";

export interface PickedFile {
  name: string;
}

export interface TextureMatch<T extends PickedFile> {
  file: T;
  blockId: string;
  face: TextureFace;
}

const FACE_SUFFIXES: { suffix: string; face: TextureFace }[] = [
  { suffix: "_top", face: "top" },
  { suffix: "_bottom", face: "bottom" },
  { suffix: "_side", face: "side" },
];

/**
 * Empareja archivos con bloques y caras por nombre:
 * "stone.png" -> stone, lados; "grass_block_top.png" -> grass_block, arriba.
 * Un nombre exacto de bloque tiene prioridad sobre un sufijo de cara. Los que no coinciden se devuelven aparte.
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

    const exact = `minecraft:${name}`;
    if (blockIds.has(exact)) {
      matched.push({ file, blockId: exact, face: "side" });
      continue;
    }
    const withFace = FACE_SUFFIXES.find((s) => name.endsWith(s.suffix));
    if (withFace) {
      const blockId = `minecraft:${name.slice(0, -withFace.suffix.length)}`;
      if (blockIds.has(blockId)) {
        matched.push({ file, blockId, face: withFace.face });
        continue;
      }
    }
    unmatched.push(file);
  }
  return { matched, unmatched };
}
