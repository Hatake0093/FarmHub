import type { DesignFileKind } from "../api/types";

/** Debe coincidir con DesignFileRules del backend. */
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
export const ACCEPTED_EXTENSIONS = [".litematic", ".png", ".jpg", ".jpeg", ".webp", ".pdf"];
export const FILE_INPUT_ACCEPT = ACCEPTED_EXTENSIONS.join(",");

const KIND_LABELS: Record<DesignFileKind, string> = {
  Litematic: "Litematica",
  Image: "Imagen",
  Pdf: "PDF",
};

export function kindLabel(kind: DesignFileKind): string {
  return KIND_LABELS[kind];
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Devuelve un mensaje de error para el archivo, o null si se puede subir. */
export function validateUpload(file: { name: string; size: number }): string | null {
  if (file.size === 0) {
    return "El archivo está vacío.";
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "El archivo supera el tamaño máximo permitido (25 MB).";
  }
  const dot = file.name.lastIndexOf(".");
  const extension = dot >= 0 ? file.name.slice(dot).toLowerCase() : "";
  if (!ACCEPTED_EXTENSIONS.includes(extension)) {
    return `Tipo de archivo no admitido. Formatos: ${ACCEPTED_EXTENSIONS.join(", ")}.`;
  }
  return null;
}
