using FarmHub.Domain.Enums;

namespace FarmHub.Domain.Entities;

/// <summary>Archivo guardado en el almacén, perteneciente a un diseño.</summary>
public sealed class DesignFile
{
    public int Id { get; set; }

    public int DesignId { get; set; }
    public Design Design { get; set; } = null!;

    public DesignFileKind Kind { get; set; }
    public required string OriginalFileName { get; set; }
    public required string ContentType { get; set; }
    public long SizeBytes { get; set; }
    public required string Sha256 { get; set; }
    public required string StorageKey { get; set; }
}
