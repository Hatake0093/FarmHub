using FarmHub.Domain.Enums;

namespace FarmHub.Api.Contracts;

public sealed record FarmRequest(
    string Name,
    string? Description,
    Difficulty Difficulty,
    int CategoryId,
    IReadOnlyList<int> MinecraftVersionIds,
    IReadOnlyList<string> Tags,
    int? WidthX = null,
    int? HeightY = null,
    int? DepthZ = null,
    string? OperatingConditions = null);

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
    int? WidthX,
    int? HeightY,
    int? DepthZ,
    string? OperatingConditions,
    IReadOnlyList<FarmDesignSummary> Designs,
    IReadOnlyList<FarmLinkResponse> Links,
    IReadOnlyList<FarmStructureLink> Structures,
    IReadOnlyList<FarmProductionResponse> Productions,
    IReadOnlyList<FarmRelationResponse> Requires,
    IReadOnlyList<FarmRelationResponse> RequiredBy);

public sealed record FarmLinkRequest(string Title, string Url, string Kind);

public sealed record FarmLinkResponse(int Id, string Title, string Url, string Kind);

public sealed record FarmProductionRequest(
    string ResourceName,
    decimal AmountPerHour,
    string Unit,
    bool RequiresAfk,
    string? MeasurementConditions,
    string? Source,
    int? MeasuredInVersionId);

public sealed record FarmProductionResponse(
    int Id,
    string ResourceName,
    decimal AmountPerHour,
    string Unit,
    bool RequiresAfk,
    string? MeasurementConditions,
    string? Source,
    int? MeasuredInVersionId,
    string? MeasuredInVersion);

public sealed record FarmDependencyRequest(int RequiredFarmId, string? Note);

public sealed record FarmRelationResponse(int DependencyId, int FarmId, string FarmName, string? Note);

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

public sealed record FarmStructureLink(int Id, string Name, int Width, int Height, int Depth, long BlockCount);

public sealed record LinkStructureRequest(int StructureId);
