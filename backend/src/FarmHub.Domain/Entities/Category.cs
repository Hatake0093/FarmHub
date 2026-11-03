namespace FarmHub.Domain.Entities;

/// <summary>Agrupa granjas por tipo (por ejemplo, mobs o recursos).</summary>
public sealed class Category
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }

    public List<Farm> Farms { get; } = [];
}
