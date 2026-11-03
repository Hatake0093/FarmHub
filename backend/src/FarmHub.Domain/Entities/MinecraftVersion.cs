namespace FarmHub.Domain.Entities;

/// <summary>Versión oficial de Minecraft Java, por ejemplo "1.21.4".</summary>
public sealed class MinecraftVersion
{
    public int Id { get; set; }
    public required string Name { get; set; }

    public List<Farm> Farms { get; } = [];
}
