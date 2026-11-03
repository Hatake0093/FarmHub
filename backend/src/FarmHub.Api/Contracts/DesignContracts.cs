namespace FarmHub.Api.Contracts;

public sealed record CreateDesignRequest(int FarmId, string Name, string? Description, int? AuthorId);

public sealed record DesignResponse(
    int Id,
    int FarmId,
    string Name,
    string? Description,
    int? AuthorId,
    IReadOnlyList<DesignFileResponse> Files);

public sealed record DesignFileResponse(
    int Id,
    string Kind,
    string OriginalFileName,
    string ContentType,
    long SizeBytes,
    string Sha256);
