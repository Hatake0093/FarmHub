namespace FarmHub.Api.Contracts;

/// <summary>
/// Vista previa de un archivo sin guardarlo. Volumes solo trae las regiones que caben en el límite
/// de volumen; el resumen trae todas.
/// </summary>
public sealed record StructurePreviewResponse(
    LitematicSummaryResponse Summary,
    IReadOnlyList<RegionVolumeResponse> Volumes);

public sealed record RegionVolumeResponse(string Region, VolumeResponse Volume);
