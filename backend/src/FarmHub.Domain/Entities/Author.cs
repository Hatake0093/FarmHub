namespace FarmHub.Domain.Entities;

/// <summary>Creador o diseñador de uno o más diseños.</summary>
public sealed class Author
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public string? Url { get; set; }

    public List<Design> Designs { get; } = [];
}
