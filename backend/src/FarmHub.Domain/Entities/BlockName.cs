namespace FarmHub.Domain.Entities;

/// <summary>Bloque del catálogo. El nombre en español lo introduce el usuario desde la aplicación.</summary>
public sealed class BlockName
{
    /// <summary>Identificador completo, p. ej. "minecraft:stone".</summary>
    public required string Id { get; set; }
    public string? SpanishName { get; set; }

    /// <summary>Color elegido para el bloque en los visores, en formato #rrggbb. Null = color automático.</summary>
    public string? Color { get; set; }

    /// <summary>Clave en el almacén de la textura subida por el usuario (imagen pequeña del bloque). Null = sin textura.</summary>
    public string? TextureKey { get; set; }
}
