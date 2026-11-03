namespace FarmHub.Domain.Litematic;

/// <summary>Modelo interno de un archivo Litematica ya interpretado.</summary>
public sealed record LitematicModel(
    string Name,
    string? Author,
    string? Description,
    IReadOnlyList<LitematicRegion> Regions);

/// <summary>
/// Región de un archivo. <see cref="SizeX"/>, <see cref="SizeY"/> y <see cref="SizeZ"/> pueden ser
/// negativos (Litematica guarda la dirección de la selección); el volumen usa sus valores absolutos.
/// </summary>
public sealed record LitematicRegion(
    string Name,
    int PositionX,
    int PositionY,
    int PositionZ,
    int SizeX,
    int SizeY,
    int SizeZ,
    IReadOnlyList<string> Palette,
    int[] PaletteIndices)
{
    public int Width => Math.Abs(SizeX);
    public int Height => Math.Abs(SizeY);
    public int Depth => Math.Abs(SizeZ);
    public long Volume => (long)Width * Height * Depth;

    /// <summary>Índice de la paleta del bloque en la posición local (x, y, z) de valor absoluto.</summary>
    public int IndexAt(int x, int y, int z) => PaletteIndices[(y * Depth + z) * Width + x];
}
