using FarmHub.Domain.Entities;

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

public static class DesignFileMapping
{
    public static DesignFileResponse From(DesignFile file) => new(
        file.Id, file.Kind.ToString(), file.OriginalFileName, file.ContentType, file.SizeBytes, file.Sha256);
}
