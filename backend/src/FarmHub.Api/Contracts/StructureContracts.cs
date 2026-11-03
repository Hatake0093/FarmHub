using FarmHub.Domain.Structures;

namespace FarmHub.Api.Contracts;

public sealed record StructureRequest(
    string Name,
    string? Description,
    int Width,
    int Height,
    int Depth,
    int BaseX,
    int BaseY,
    int BaseZ);

public sealed record StructureMetaRequest(
    string Name,
    string? Description,
    int BaseX,
    int BaseY,
    int BaseZ);

public sealed record StructureListItem(int Id, string Name, string? Description, int Width, int Height, int Depth, DateTime UpdatedAtUtc);

public sealed record StructureDetail(
    int Id,
    string Name,
    string? Description,
    int Width,
    int Height,
    int Depth,
    int BaseX,
    int BaseY,
    int BaseZ,
    IReadOnlyList<string> Palette,
    long BlockCount,
    DateTime UpdatedAtUtc);

public sealed record StructureLayer(int Y, int Width, int Depth, IReadOnlyList<string> Palette, int[] Cells);

public sealed record StructureBlocksRequest(IReadOnlyList<StructureBlockChange> Changes);

public sealed record BlockNameResponse(string Id, string EnglishName, string? SpanishName, string? Color, bool HasTexture);

public sealed record SpanishNameRequest(string? SpanishName, string? Color);

public sealed record ItemNameResponse(string Id, string EnglishName, string? SpanishName, string? Color);

public sealed record NewItemRequest(string Name);

public sealed record StructureResizeRequest(int Width, int Height, int Depth, bool Confirm);

public sealed record StructureExtendRequest(int Left, int Right, int Down, int Up, int Back, int Front);
