namespace FarmHub.Domain.Entities;

/// <summary>Item del catálogo, con nombre en español y color de visualización editables.</summary>
public sealed class ItemName
{
    /// <summary>Identificador completo, p. ej. "minecraft:apple".</summary>
    public required string Id { get; set; }
    public string? SpanishName { get; set; }
    public string? Color { get; set; }
}
