using FarmHub.Domain.Enums;

namespace FarmHub.Api.Contracts;

public sealed record FarmRequest(
    string Name,
    string? Description,
    Difficulty Difficulty,
    int CategoryId,
    IReadOnlyList<int> MinecraftVersionIds,
    IReadOnlyList<string> Tags);

public sealed record FarmSummaryResponse(
    int Id,
    string Name,
    Difficulty Difficulty,
    int CategoryId,
    string CategoryName,
    IReadOnlyList<string> MinecraftVersions,
    IReadOnlyList<string> Tags);

public sealed record FarmDetailResponse(
    int Id,
    string Name,
    string? Description,
    Difficulty Difficulty,
    CategoryResponse Category,
    IReadOnlyList<MinecraftVersionResponse> MinecraftVersions,
    IReadOnlyList<string> Tags,
    IReadOnlyList<FarmDesignSummary> Designs);

public sealed record FarmDesignSummary(
    int Id,
    string Name,
    string? Description,
    int? AuthorId,
    string? AuthorName,
    IReadOnlyList<DesignFileResponse> Files);

public sealed record PagedResponse<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount);

public sealed record CategoryRequest(string Name, string? Description);

public sealed record CategoryResponse(int Id, string Name, string? Description);

public sealed record MinecraftVersionRequest(string Name);

public sealed record MinecraftVersionResponse(int Id, string Name);

public sealed record AuthorRequest(string Name, string? Url);

public sealed record AuthorResponse(int Id, string Name, string? Url);
