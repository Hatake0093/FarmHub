using FarmHub.Domain.Enums;

namespace FarmHub.Domain.Entities;

/// <summary>
/// Producción medida de una granja. Los valores son estimaciones válidas solo bajo
/// las condiciones de medición indicadas.
/// </summary>
public sealed class FarmProduction
{
    public int Id { get; set; }
    public int FarmId { get; set; }
    public Farm Farm { get; set; } = null!;

    public required string ResourceName { get; set; }
    public decimal AmountPerHour { get; set; }
    public ProductionUnit Unit { get; set; }
    public bool RequiresAfk { get; set; }
    public string? MeasurementConditions { get; set; }
    public string? Source { get; set; }

    public int? MeasuredInVersionId { get; set; }
    public MinecraftVersion? MeasuredInVersion { get; set; }
}
