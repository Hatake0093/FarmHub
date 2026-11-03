namespace FarmHub.Api.Contracts;

/// <summary>
/// Volumen completo en una sola respuesta. Cells son índices de paleta de 16 bits (little-endian)
/// en base64, con el orden (y * depth + z) * width + x.
/// </summary>
public sealed record VolumeResponse(
    int Width,
    int Height,
    int Depth,
    IReadOnlyList<string> Palette,
    string CellsBase64);

public static class VolumeEncoder
{
    /// <summary>Límite de celdas que se envían de una vez (1 millón).</summary>
    public const long MaxCells = 1_000_000;

    public static string EncodeUInt16(IEnumerable<int> indices, int count)
    {
        var bytes = new byte[count * 2];
        var i = 0;
        foreach (var value in indices)
        {
            bytes[i * 2] = (byte)(value & 0xFF);
            bytes[i * 2 + 1] = (byte)((value >> 8) & 0xFF);
            i++;
        }
        return Convert.ToBase64String(bytes);
    }
}
