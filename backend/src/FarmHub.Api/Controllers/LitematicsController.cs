using FarmHub.Api.Contracts;
using FarmHub.Domain.Enums;
using FarmHub.Domain.Litematic;
using FarmHub.Domain.Storage;
using FarmHub.Infrastructure.Structures;
using FarmHub.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FarmHub.Api.Controllers;

/// <summary>Consulta de estructuras (.litematic, .schem, .nbt) ya subidas a un diseño.</summary>
[ApiController]
[Route("api/design-files/{id:int}/structure")]
public sealed class LitematicsController(FarmHubDbContext db, IFileStorage storage) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<LitematicSummaryResponse>> Summary(int id, CancellationToken ct)
    {
        var model = await LoadAsync(id, ct);
        if (model is null)
        {
            return NotFound();
        }

        var counts = LitematicStatistics.CountBlocks(model);
        var blockCounts = counts.Select(kv => new LitematicBlockCount(kv.Key, kv.Value, (kv.Value + 63) / 64)).ToList();

        return new LitematicSummaryResponse(
            model.Name,
            model.Author,
            model.Description,
            model.Regions.Select(r => new LitematicRegionSummary(
                r.Name, r.PositionX, r.PositionY, r.PositionZ,
                r.Width, r.Height, r.Depth, r.SizeX, r.SizeY, r.SizeZ)).ToList(),
            blockCounts,
            counts.Values.Sum());
    }

    /// <summary>Volumen completo de una región, de una vez. Por defecto la primera región.</summary>
    [HttpGet("volume")]
    public async Task<ActionResult<VolumeResponse>> Volume(int id, [FromQuery] string? region, CancellationToken ct)
    {
        var model = await LoadAsync(id, ct);
        if (model is null)
        {
            return NotFound();
        }

        var target = region is null
            ? model.Regions.FirstOrDefault()
            : model.Regions.FirstOrDefault(r => r.Name == region);
        if (target is null)
        {
            return NotFound(new ProblemDetails { Title = "La región no existe en el archivo." });
        }

        var count = target.Volume;
        if (count > VolumeEncoder.MaxCells)
        {
            return ValidationProblem($"La región tiene {count:N0} bloques; el máximo para la vista de volumen es {VolumeEncoder.MaxCells:N0}.");
        }

        return new VolumeResponse(
            target.Width,
            target.Height,
            target.Depth,
            target.Palette,
            VolumeEncoder.EncodeUInt16(target.PaletteIndices, target.PaletteIndices.Length));
    }

    [HttpGet("layer")]
    public async Task<ActionResult<LitematicLayerResponse>> Layer(
        int id, [FromQuery] string region, [FromQuery] int y, CancellationToken ct)
    {
        var model = await LoadAsync(id, ct);
        if (model is null)
        {
            return NotFound();
        }

        var target = model.Regions.FirstOrDefault(r => r.Name == region);
        if (target is null)
        {
            return NotFound(new ProblemDetails { Title = "La región no existe en el archivo." });
        }

        if (y < 0 || y >= target.Height)
        {
            return ValidationProblem($"La capa debe estar entre 0 y {target.Height - 1}.");
        }

        var cells = new int[target.Width * target.Depth];
        for (int z = 0; z < target.Depth; z++)
        {
            for (int x = 0; x < target.Width; x++)
            {
                cells[z * target.Width + x] = target.IndexAt(x, y, z);
            }
        }

        return new LitematicLayerResponse(target.Name, y, target.Width, target.Depth, target.Palette, cells);
    }

    /// <summary>Carga el archivo del diseño y lo interpreta. Null si no es una estructura.</summary>
    private async Task<LitematicModel?> LoadAsync(int id, CancellationToken ct)
    {
        var file = await db.DesignFiles.AsNoTracking().FirstOrDefaultAsync(f => f.Id == id, ct);
        if (file is null || !StructureFileReader.IsStructureKind(file.Kind))
        {
            return null;
        }

        await using var stream = storage.OpenRead(file.StorageKey);
        return StructureFileReader.Read(file.Kind, stream);
    }
}
