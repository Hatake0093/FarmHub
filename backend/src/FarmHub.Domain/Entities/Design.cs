namespace FarmHub.Domain.Entities;

/// <summary>Diseño o blueprint asociado a una granja. Puede tener varios archivos.</summary>
public sealed class Design
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }

    public int FarmId { get; set; }
    public Farm Farm { get; set; } = null!;

    public int? AuthorId { get; set; }
    public Author? Author { get; set; }

    public List<DesignFile> Files { get; } = [];
}
