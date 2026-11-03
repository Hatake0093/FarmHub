using FarmHub.Domain.Enums;

namespace FarmHub.Domain.Entities;

/// <summary>Tutorial o referencia externa asociada a una granja.</summary>
public sealed class FarmLink
{
    public int Id { get; set; }
    public int FarmId { get; set; }
    public Farm Farm { get; set; } = null!;

    public required string Title { get; set; }
    public required string Url { get; set; }
    public FarmLinkKind Kind { get; set; }
}
