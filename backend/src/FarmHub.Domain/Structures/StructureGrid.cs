namespace FarmHub.Domain.Structures;

/// <summary>
/// Rejilla de bloques editable. Índice local: (y * depth + z) * width + x, igual que los lectores.
/// La celda 0 de la paleta es siempre aire. Cada celda guarda un índice de paleta (máx. 256 entradas).
/// </summary>
public sealed class StructureGrid
{
    public const string Air = "minecraft:air";
    public const int MaxPaletteSize = 256;
    public const long MaxVolume = 1_000_000;
    public const int MaxDimension = 200;

    private readonly List<string> _palette;
    private readonly byte[] _cells;

    public StructureGrid(int width, int height, int depth, IEnumerable<string>? palette = null, byte[]? cells = null)
    {
        ValidateDimensions(width, height, depth);
        Width = width;
        Height = height;
        Depth = depth;

        _palette = palette?.ToList() ?? [Air];
        if (_palette.Count == 0 || _palette[0] != Air || _palette.Count > MaxPaletteSize)
        {
            throw new ArgumentException("La paleta debe empezar por aire y tener como máximo 256 entradas.");
        }

        var volume = (int)((long)width * height * depth);
        if (cells is null)
        {
            _cells = new byte[volume];
        }
        else
        {
            if (cells.Length != volume)
            {
                throw new ArgumentException("El número de celdas no coincide con las dimensiones.");
            }
            _cells = cells;
        }
    }

    public int Width { get; }
    public int Height { get; }
    public int Depth { get; }
    public IReadOnlyList<string> Palette => _palette;
    public byte[] Cells => _cells;

    public static void ValidateDimensions(int width, int height, int depth)
    {
        if (width < 1 || height < 1 || depth < 1 || width > MaxDimension || height > MaxDimension || depth > MaxDimension)
        {
            throw new ArgumentException($"Cada dimensión debe estar entre 1 y {MaxDimension}.");
        }
        if ((long)width * height * depth > MaxVolume)
        {
            throw new ArgumentException($"El volumen no puede superar {MaxVolume:N0} bloques.");
        }
    }

    public int IndexOf(int x, int y, int z)
    {
        if (x < 0 || y < 0 || z < 0 || x >= Width || y >= Height || z >= Depth)
        {
            throw new ArgumentOutOfRangeException(nameof(x), "Posición fuera de la estructura.");
        }
        return (y * Depth + z) * Width + x;
    }

    public string BlockAt(int x, int y, int z) => _palette[_cells[IndexOf(x, y, z)]];

    /// <summary>Pone un bloque (o aire si block es null) en una posición. Añade la entrada a la paleta si hace falta.</summary>
    public void Set(int x, int y, int z, string? block)
    {
        var name = string.IsNullOrWhiteSpace(block) ? Air : block.Trim();
        var paletteIndex = _palette.IndexOf(name);
        if (paletteIndex < 0)
        {
            if (_palette.Count >= MaxPaletteSize)
            {
                throw new InvalidOperationException("La estructura ya usa 256 bloques distintos.");
            }
            _palette.Add(name);
            paletteIndex = _palette.Count - 1;
        }
        _cells[IndexOf(x, y, z)] = (byte)paletteIndex;
    }
}
