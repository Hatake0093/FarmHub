using FarmHub.Api.Contracts;
using FarmHub.Domain.Entities;
using FarmHub.Domain.Enums;
using FarmHub.Domain.Rules;
using FarmHub.Domain.Storage;
using FarmHub.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FarmHub.Api.Controllers;

[ApiController]
[Route("api/farms")]
public sealed class FarmsController(FarmHubDbContext db, IFileStorage storage) : ControllerBase
{
    private const int MaxPageSize = 100;
    private const int MaxNameLength = 200;
    private const int MaxDescriptionLength = 4000;
    private const int MaxDimension = 10_000;

    [HttpGet]
    public async Task<ActionResult<PagedResponse<FarmSummaryResponse>>> List(
        [FromQuery] string? q,
        [FromQuery] int? categoryId,
        [FromQuery] Difficulty? difficulty,
        [FromQuery] string? tag,
        [FromQuery] string? version,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        if (page < 1 || pageSize < 1 || pageSize > MaxPageSize)
        {
            return Problem($"page debe ser >= 1 y pageSize entre 1 y {MaxPageSize}.", statusCode: 400);
        }

        var query = db.Farms.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(q))
        {
            // ILike sin distinguir mayúsculas; se escapan los comodines del usuario.
            var pattern = "%" + q.Trim().Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_") + "%";
            query = query.Where(f => EF.Functions.ILike(f.Name, pattern));
        }

        if (categoryId is { } categoryFilter)
        {
            query = query.Where(f => f.CategoryId == categoryFilter);
        }

        if (difficulty is { } difficultyFilter)
        {
            query = query.Where(f => f.Difficulty == difficultyFilter);
        }

        if (!string.IsNullOrWhiteSpace(tag))
        {
            var normalizedTag = TagNormalizer.Normalize(tag);
            if (normalizedTag is null)
            {
                return ValidationProblem("Etiqueta de filtro no válida.");
            }
            query = query.Where(f => f.Tags.Any(t => t.Name == normalizedTag));
        }

        if (!string.IsNullOrWhiteSpace(version))
        {
            var versionName = version.Trim();
            query = query.Where(f => f.MinecraftVersions.Any(v => v.Name == versionName));
        }

        var total = await query.CountAsync(ct);

        var farms = await query
            .OrderBy(f => f.Name).ThenBy(f => f.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Include(f => f.Category)
            .Include(f => f.MinecraftVersions)
            .Include(f => f.Tags)
            .AsSplitQuery()
            .ToListAsync(ct);

        var items = farms.Select(ToSummary).ToList();
        return new PagedResponse<FarmSummaryResponse>(items, page, pageSize, total);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<FarmDetailResponse>> GetById(int id, CancellationToken ct)
    {
        var farm = await LoadDetailQuery().FirstOrDefaultAsync(f => f.Id == id, ct);

        return farm is null ? NotFound() : ToDetail(farm);
    }

    [HttpPost]
    public async Task<ActionResult<FarmDetailResponse>> Create(FarmRequest request, CancellationToken ct)
    {
        var validation = await ValidateAsync(request, ct);
        if (validation.Problem is not null)
        {
            return validation.Problem;
        }

        var farm = new Farm
        {
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            Difficulty = request.Difficulty,
            CategoryId = request.CategoryId,
            WidthX = request.WidthX,
            HeightY = request.HeightY,
            DepthZ = request.DepthZ,
            OperatingConditions = request.OperatingConditions?.Trim(),
        };
        farm.MinecraftVersions.AddRange(validation.Versions!);
        farm.Tags.AddRange(await ResolveTagsAsync(validation.TagNames!, ct));

        db.Farms.Add(farm);
        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetById), new { id = farm.Id }, (await LoadDetailAsync(farm.Id, ct))!);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<FarmDetailResponse>> Update(int id, FarmRequest request, CancellationToken ct)
    {
        var farm = await db.Farms
            .Include(f => f.MinecraftVersions)
            .Include(f => f.Tags)
            .FirstOrDefaultAsync(f => f.Id == id, ct);
        if (farm is null)
        {
            return NotFound();
        }

        var validation = await ValidateAsync(request, ct);
        if (validation.Problem is not null)
        {
            return validation.Problem;
        }

        farm.Name = request.Name.Trim();
        farm.Description = request.Description?.Trim();
        farm.Difficulty = request.Difficulty;
        farm.CategoryId = request.CategoryId;
        farm.WidthX = request.WidthX;
        farm.HeightY = request.HeightY;
        farm.DepthZ = request.DepthZ;
        farm.OperatingConditions = request.OperatingConditions?.Trim();

        farm.MinecraftVersions.Clear();
        farm.MinecraftVersions.AddRange(validation.Versions!);

        farm.Tags.Clear();
        farm.Tags.AddRange(await ResolveTagsAsync(validation.TagNames!, ct));

        await db.SaveChangesAsync(ct);

        return (await LoadDetailAsync(id, ct))!;
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var farm = await db.Farms
            .Include(f => f.Designs).ThenInclude(d => d.Files)
            .Include(f => f.Designs).ThenInclude(d => d.Author)
            .FirstOrDefaultAsync(f => f.Id == id, ct);
        if (farm is null)
        {
            return NotFound();
        }

        // Los diseños y sus archivos se borran en cascada en la base de datos.
        // Los archivos del disco se borran después de confirmar la transacción.
        var storageKeys = farm.Designs.SelectMany(d => d.Files).Select(f => f.StorageKey).ToList();

        db.Farms.Remove(farm);
        await db.SaveChangesAsync(ct);

        foreach (var key in storageKeys)
        {
            storage.Delete(key);
        }

        return NoContent();
    }

    private async Task<(ActionResult? Problem, List<MinecraftVersion>? Versions, List<string>? TagNames)> ValidateAsync(
        FarmRequest request, CancellationToken ct)
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(request.Name) || request.Name.Trim().Length > MaxNameLength)
        {
            errors["name"] = [$"El nombre es obligatorio y no puede superar {MaxNameLength} caracteres."];
        }

        if (request.Description is { Length: > MaxDescriptionLength })
        {
            errors["description"] = [$"La descripción no puede superar {MaxDescriptionLength} caracteres."];
        }

        foreach (var (field, value) in new[] { ("widthX", request.WidthX), ("heightY", request.HeightY), ("depthZ", request.DepthZ) })
        {
            if (value is { } size && (size < 1 || size > MaxDimension))
            {
                errors[field] = [$"La dimensión debe estar entre 1 y {MaxDimension} bloques."];
            }
        }

        if (request.OperatingConditions is { Length: > MaxDescriptionLength })
        {
            errors["operatingConditions"] = [$"Las condiciones no pueden superar {MaxDescriptionLength} caracteres."];
        }

        if (!Enum.IsDefined(request.Difficulty))
        {
            errors["difficulty"] = ["Dificultad no válida."];
        }

        if (!await db.Categories.AnyAsync(c => c.Id == request.CategoryId, ct))
        {
            errors["categoryId"] = ["La categoría indicada no existe."];
        }

        var versionIds = request.MinecraftVersionIds.Distinct().ToList();
        var versions = await db.MinecraftVersions
            .Where(v => versionIds.Contains(v.Id))
            .ToListAsync(ct);
        if (versions.Count != versionIds.Count)
        {
            errors["minecraftVersionIds"] = ["Alguna versión de Minecraft indicada no existe."];
        }

        var tagNames = new List<string>();
        foreach (var raw in request.Tags)
        {
            var normalized = TagNormalizer.Normalize(raw);
            if (normalized is null)
            {
                errors["tags"] = [$"La etiqueta '{raw}' no es válida."];
                break;
            }
            if (!tagNames.Contains(normalized))
            {
                tagNames.Add(normalized);
            }
        }

        if (errors.Count > 0)
        {
            return (ValidationProblem(new ValidationProblemDetails(errors)), null, null);
        }

        return (null, versions, tagNames);
    }

    // Reutiliza etiquetas existentes y crea solo las nuevas.
    private async Task<List<Tag>> ResolveTagsAsync(List<string> names, CancellationToken ct)
    {
        var existing = await db.Tags.Where(t => names.Contains(t.Name)).ToListAsync(ct);
        foreach (var name in names.Where(n => existing.All(t => t.Name != n)))
        {
            var created = new Tag { Name = name };
            db.Tags.Add(created);
            existing.Add(created);
        }
        return existing;
    }

    private IQueryable<Farm> LoadDetailQuery() => db.Farms
        .AsNoTracking()
        .Include(f => f.Category)
        .Include(f => f.MinecraftVersions)
        .Include(f => f.Tags)
        .Include(f => f.Designs).ThenInclude(d => d.Files)
        .Include(f => f.Designs).ThenInclude(d => d.Author)
        .Include(f => f.Links)
        .Include(f => f.Structures)
        .Include(f => f.Productions).ThenInclude(p => p.MeasuredInVersion)
        .Include(f => f.Requires).ThenInclude(r => r.RequiredFarm)
        .Include(f => f.RequiredBy).ThenInclude(r => r.Farm)
        .AsSplitQuery();

    private async Task<FarmDetailResponse?> LoadDetailAsync(int id, CancellationToken ct)
    {
        var farm = await LoadDetailQuery().FirstOrDefaultAsync(f => f.Id == id, ct);

        return farm is null ? null : ToDetail(farm);
    }

    private static FarmSummaryResponse ToSummary(Farm farm) => new(
        farm.Id,
        farm.Name,
        farm.Difficulty,
        farm.CategoryId,
        farm.Category.Name,
        farm.MinecraftVersions.Select(v => v.Name).OrderBy(v => v).ToList(),
        farm.Tags.Select(t => t.Name).OrderBy(t => t).ToList());

    private static FarmDetailResponse ToDetail(Farm farm) => new(
        farm.Id,
        farm.Name,
        farm.Description,
        farm.Difficulty,
        new CategoryResponse(farm.Category.Id, farm.Category.Name, farm.Category.Description),
        farm.MinecraftVersions.OrderBy(v => v.Name).Select(v => new MinecraftVersionResponse(v.Id, v.Name)).ToList(),
        farm.Tags.Select(t => t.Name).OrderBy(t => t).ToList(),
        farm.WidthX,
        farm.HeightY,
        farm.DepthZ,
        farm.OperatingConditions,
        farm.Designs.OrderBy(d => d.Name).Select(d => new FarmDesignSummary(
            d.Id,
            d.Name,
            d.Description,
            d.AuthorId,
            d.Author?.Name,
            d.Files.OrderBy(f => f.OriginalFileName).Select(DesignFileMapping.From).ToList())).ToList(),
        farm.Links.OrderBy(l => l.Title).Select(FarmLinkMapping.From).ToList(),
        farm.Structures.OrderBy(s => s.Name).Select(s => new FarmStructureLink(
            s.Id, s.Name, s.Width, s.Height, s.Depth,
            (long)s.Width * s.Height * s.Depth - s.Cells.LongCount(c => c == 0))).ToList(),
        farm.Productions.OrderBy(p => p.ResourceName).Select(FarmProductionMapping.From).ToList(),
        farm.Requires.OrderBy(r => r.RequiredFarm.Name)
            .Select(r => new FarmRelationResponse(r.Id, r.RequiredFarmId, r.RequiredFarm.Name, r.Note)).ToList(),
        farm.RequiredBy.OrderBy(r => r.Farm.Name)
            .Select(r => new FarmRelationResponse(r.Id, r.FarmId, r.Farm.Name, r.Note)).ToList());
}
