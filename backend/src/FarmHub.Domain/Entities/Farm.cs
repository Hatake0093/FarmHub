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

    /// <summary>Dimensiones del montaje en bloques (ejes X, Y, Z). Null si no se conocen.</summary>
    public int? WidthX { get; set; }
    public int? HeightY { get; set; }
    public int? DepthZ { get; set; }

    public string? OperatingConditions { get; set; }

    public List<Design> Designs { get; } = [];
    public List<FarmLink> Links { get; } = [];
    public List<FarmProduction> Productions { get; } = [];
    public List<FarmDependency> Requires { get; } = [];
    public List<FarmDependency> RequiredBy { get; } = [];
    public List<MinecraftVersion> MinecraftVersions { get; } = [];
    public List<Tag> Tags { get; } = [];
}
