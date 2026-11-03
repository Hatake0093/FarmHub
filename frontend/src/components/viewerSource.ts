import { litematicApi, type LitematicLayer, type LitematicSummary } from "../api/litematic";
import type { StructurePreview } from "../api/structurePreviews";
import { layerFromVolume, type VolumeDto } from "../lib/volume";

/** De dónde saca el visor sus datos: un archivo guardado o una vista previa en memoria. */
export interface ViewerSource {
  summary: () => Promise<LitematicSummary>;
  volume: (region: string) => Promise<VolumeDto>;
  layer: (region: string, y: number) => Promise<LitematicLayer>;
}

/** Fuente para un archivo que ya está en un diseño. */
export function savedFileSource(fileId: number): ViewerSource {
  return {
    summary: () => litematicApi.summary(fileId),
    volume: (region) => litematicApi.volume(fileId, region),
    layer: (region, y) => litematicApi.layer(fileId, region, y),
  };
}

/** Fuente para una vista previa: los datos ya llegaron, así que las capas se calculan aquí. */
export function previewSource(preview: StructurePreview): ViewerSource {
  const findVolume = (region: string): VolumeDto => {
    const found = preview.volumes.find((v) => v.region === region);
    if (!found) throw new Error("Esta región es demasiado grande para la vista previa.");
    return found.volume;
  };
  return {
    summary: async () => preview.summary,
    volume: async (region) => findVolume(region),
    layer: async (region, y) => ({ region, ...layerFromVolume(findVolume(region), y) }),
  };
}
