namespace FarmHub.Domain.Entities;

/// <summary>
/// Esquemático independiente de cualquier granja. Las celdas se guardan como índices de paleta;
/// la paleta, como nombres separados por saltos de línea.
/// </summary>
public sealed class SavedStructure
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }
    public int Width { get; set; }
    public int Height { get; set; }
    public int Depth { get; set; }

    /// <summary>
    /// Coordenada del mundo donde se coloca la esquina (0,0,0) local. Permite saber qué coordenada
    /// del mundo corresponde a cada bloque mientras se construye.
    /// </summary>
    public int BaseX { get; set; }
    public int BaseY { get; set; }
    public int BaseZ { get; set; }
    public required string PaletteText { get; set; }
    public required byte[] Cells { get; set; }
    public DateTime UpdatedAtUtc { get; set; }

    public List<Farm> Farms { get; } = [];
}
