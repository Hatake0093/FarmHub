namespace FarmHub.Domain.Entities;

/// <summary>Etiqueta libre para filtrar granjas.</summary>
public sealed class Tag
{
    public int Id { get; set; }
    public required string Name { get; set; }

    public List<Farm> Farms { get; } = [];
}
