namespace FarmHub.Domain.Entities;

/// <summary>
/// Indica que <see cref="FarmId"/> necesita recursos o materiales de <see cref="RequiredFarmId"/>.
/// </summary>
public sealed class FarmDependency
{
    public int Id { get; set; }

    public int FarmId { get; set; }
    public Farm Farm { get; set; } = null!;

    public int RequiredFarmId { get; set; }
    public Farm RequiredFarm { get; set; } = null!;

    public string? Note { get; set; }
}
