namespace FarmHub.Api.Contracts;

public sealed record LitematicSummaryResponse(
    string Name,
    string? Author,
    string? Description,
    IReadOnlyList<LitematicRegionSummary> Regions,
    IReadOnlyList<LitematicBlockCount> BlockCounts,
    long TotalBlocks);

public sealed record LitematicRegionSummary(
    string Name,
    int PositionX,
    int PositionY,
    int PositionZ,
    int Width,
    int Height,
    int Depth,
    int SizeX,
    int SizeY,
    int SizeZ);

/// <summary>Cantidad de un bloque. Stacks = ceil(cantidad / 64), tamaño de stack en Minecraft.</summary>
public sealed record LitematicBlockCount(string Block, long Count, long Stacks);

/// <summary>
/// Una capa horizontal (eje Y local) de una región. Cells contiene índices de Palette
/// en orden z * Width + x.
/// </summary>
public sealed record LitematicLayerResponse(
    string Region,
    int Y,
    int Width,
    int Depth,
    IReadOnlyList<string> Palette,
    int[] Cells);
