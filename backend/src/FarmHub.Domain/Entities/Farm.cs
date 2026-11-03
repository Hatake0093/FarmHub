using FarmHub.Domain.Enums;

namespace FarmHub.Domain.Entities;

/// <summary>Ficha técnica de una granja. La producción se modelará en una fase posterior.</summary>
public sealed class Farm
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }
    public Difficulty Difficulty { get; set; }

    public int CategoryId { get; set; }
    public Category Category { get; set; } = null!;

    public List<Design> Designs { get; } = [];
    public List<MinecraftVersion> MinecraftVersions { get; } = [];
    public List<Tag> Tags { get; } = [];
}
