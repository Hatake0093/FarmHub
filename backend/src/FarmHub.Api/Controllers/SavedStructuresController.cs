using System.Text.RegularExpressions;
using FarmHub.Api.Contracts;
using FarmHub.Domain.Entities;
using FarmHub.Domain.Structures;
using FarmHub.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FarmHub.Api.Controllers;

/// <summary>Esquemáticos propios, independientes de cualquier granja.</summary>
[ApiController]
[Route("api/structures")]
public sealed class SavedStructuresController(FarmHubDbContext db) : ControllerBase
{
    private const int MaxChangesPerRequest = 100_000;
    private static readonly Regex BlockId = new(@"^[a-z0-9_.-]+:[a-z0-9/_.-]+$", RegexOptions.Compiled);

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<StructureListItem>>> List(CancellationToken ct) =>
        await db.SavedStructures.AsNoTracking()
            .OrderBy(s => s.Name)
            .Select(s => new StructureListItem(s.Id, s.Name, s.Width, s.Height, s.Depth, s.UpdatedAtUtc))
            .ToListAsync(ct);

    [HttpPost]
    public async Task<ActionResult<StructureDetail>> Create(StructureRequest request, CancellationToken ct)
    {
        var name = request.Name?.Trim();
        if (string.IsNullOrEmpty(name) || name.Length > 200)
        {
            return ValidationProblem("El nombre es obligatorio y no puede superar 200 caracteres.");
        }
        if (request.Description is { Length: > 4000 })
        {
            return ValidationProblem("La descripción no puede superar 4000 caracteres.");
        }

        StructureGrid grid;
        try
        {
            grid = new StructureGrid(request.Width, request.Height, request.Depth);
        }
        catch (ArgumentException ex)
        {
            return ValidationProblem(ex.Message);
        }

        var entity = new SavedStructure
        {
            Name = name,
            Description = request.Description?.Trim(),
            Width = grid.Width,
            Height = grid.Height,
            Depth = grid.Depth,
            BaseX = request.BaseX,
            BaseY = request.BaseY,
            BaseZ = request.BaseZ,
            PaletteText = string.Join('\n', grid.Palette),
            Cells = grid.Cells,
            UpdatedAtUtc = DateTime.UtcNow,
        };
        db.SavedStructures.Add(entity);
        await db.SaveChangesAsync(ct);

        return StatusCode(StatusCodes.Status201Created, ToDetail(entity));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<StructureDetail>> Get(int id, CancellationToken ct)
    {
        var entity = await db.SavedStructures.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id, ct);
        return entity is null ? NotFound() : ToDetail(entity);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<StructureDetail>> UpdateMeta(int id, StructureMetaRequest request, CancellationToken ct)
    {
        var entity = await db.SavedStructures.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (entity is null)
        {
            return NotFound();
        }

        var name = request.Name?.Trim();
        if (string.IsNullOrEmpty(name) || name.Length > 200)
        {
            return ValidationProblem("El nombre es obligatorio y no puede superar 200 caracteres.");
        }

        entity.Name = name;
        entity.Description = request.Description?.Trim();
        entity.BaseX = request.BaseX;
        entity.BaseY = request.BaseY;
        entity.BaseZ = request.BaseZ;
        entity.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        return ToDetail(entity);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var entity = await db.SavedStructures.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (entity is null)
        {
            return NotFound();
        }

        db.SavedStructures.Remove(entity);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpGet("{id:int}/layer")]
    public async Task<ActionResult<StructureLayer>> Layer(int id, [FromQuery] int y, CancellationToken ct)
    {
        var entity = await db.SavedStructures.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id, ct);
        if (entity is null)
        {
            return NotFound();
        }
        if (y < 0 || y >= entity.Height)
        {
            return ValidationProblem($"La capa debe estar entre 0 y {entity.Height - 1}.");
        }

        var grid = ToGrid(entity);
        var cells = new int[grid.Width * grid.Depth];
        for (int z = 0; z < grid.Depth; z++)
        {
            for (int x = 0; x < grid.Width; x++)
            {
                cells[z * grid.Width + x] = grid.Cells[grid.IndexOf(x, y, z)];
            }
        }
        return new StructureLayer(y, grid.Width, grid.Depth, grid.Palette, cells);
    }

    /// <summary>
    /// Cambia el tamaño. Los bloques que siguen dentro se conservan; los que quedan fuera se borran.
    /// Si se borrarían bloques y Confirm es false, responde 409 con el número de bloques afectados.
    /// </summary>
    [HttpPut("{id:int}/size")]
    public async Task<ActionResult<StructureDetail>> Resize(int id, StructureResizeRequest request, CancellationToken ct)
    {
        var entity = await db.SavedStructures.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (entity is null)
        {
            return NotFound();
        }

        try
        {
            StructureGrid.ValidateDimensions(request.Width, request.Height, request.Depth);
        }
        catch (ArgumentException ex)
        {
            return ValidationProblem(ex.Message);
        }

        var oldCells = entity.Cells;
        int ow = entity.Width, oh = entity.Height, od = entity.Depth;
        int nw = request.Width, nh = request.Height, nd = request.Depth;

        // Bloques que dejan de caber (las celdas con palette index distinto de aire).
        long removed = 0;
        for (int y = 0; y < oh; y++)
        {
            for (int z = 0; z < od; z++)
            {
                for (int x = 0; x < ow; x++)
                {
                    if (oldCells[(y * od + z) * ow + x] == 0) continue;
                    if (x >= nw || y >= nh || z >= nd) removed++;
                }
            }
        }

        if (removed > 0 && !request.Confirm)
        {
            return Conflict(new ProblemDetails
            {
                Title = $"El nuevo tamaño dejaría fuera {removed} bloques. Confirma para borrarlos.",
            });
        }

        var newCells = new byte[nw * nh * nd];
        for (int y = 0; y < Math.Min(oh, nh); y++)
        {
            for (int z = 0; z < Math.Min(od, nd); z++)
            {
                for (int x = 0; x < Math.Min(ow, nw); x++)
                {
                    newCells[(y * nd + z) * nw + x] = oldCells[(y * od + z) * ow + x];
                }
            }
        }

        entity.Width = nw;
        entity.Height = nh;
        entity.Depth = nd;
        entity.Cells = newCells;
        entity.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        return ToDetail(entity);
    }

    [HttpPatch("{id:int}/blocks")]
    public async Task<ActionResult<StructureDetail>> ChangeBlocks(int id, StructureBlocksRequest request, CancellationToken ct)
    {
        var entity = await db.SavedStructures.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (entity is null)
        {
            return NotFound();
        }
        if (request.Changes.Count == 0 || request.Changes.Count > MaxChangesPerRequest)
        {
            return ValidationProblem($"Envía entre 1 y {MaxChangesPerRequest} cambios por petición.");
        }

        foreach (var change in request.Changes)
        {
            if (!string.IsNullOrWhiteSpace(change.Block) && !BlockId.IsMatch(change.Block.Trim()))
            {
                return ValidationProblem($"'{change.Block}' no es un identificador de bloque válido (p. ej. minecraft:stone).");
            }
        }

        // Se trabaja sobre una copia y se asigna un array nuevo: EF Core no detecta
        // cambios hechos dentro de un byte[] que ya estaba asignado.
        var grid = ToGrid(entity, copyCells: true);
        try
        {
            foreach (var change in request.Changes)
            {
                grid.Set(change.X, change.Y, change.Z, change.Block);
            }
        }
        catch (Exception ex) when (ex is ArgumentOutOfRangeException or InvalidOperationException)
        {
            return ValidationProblem(ex.Message);
        }

        entity.PaletteText = string.Join('\n', grid.Palette);
        entity.Cells = grid.Cells;
        entity.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        return ToDetail(entity);
    }

    private static StructureGrid ToGrid(SavedStructure entity, bool copyCells = false) => new(
        entity.Width,
        entity.Height,
        entity.Depth,
        entity.PaletteText.Split('\n'),
        copyCells ? (byte[])entity.Cells.Clone() : entity.Cells);

    private static StructureDetail ToDetail(SavedStructure entity) => new(
        entity.Id,
        entity.Name,
        entity.Description,
        entity.Width,
        entity.Height,
        entity.Depth,
        entity.BaseX,
        entity.BaseY,
        entity.BaseZ,
        entity.PaletteText.Split('\n'),
        (long)entity.Width * entity.Height * entity.Depth
            - entity.Cells.LongCount(c => c == 0),
        entity.UpdatedAtUtc);
}
