using FarmHub.Api.Contracts;
using FarmHub.Domain.Entities;
using FarmHub.Infrastructure.Catalog;
using FarmHub.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FarmHub.Api.Controllers;

/// <summary>Catálogo de bloques con nombres en español editables.</summary>
[ApiController]
[Route("api/blocks")]
public sealed class BlocksController(FarmHubDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<BlockNameResponse>>> List(
        [FromQuery] string? q, [FromQuery] bool missingSpanish = false, CancellationToken ct = default)
    {
        var query = db.BlockNames.AsNoTracking().AsQueryable();
        if (missingSpanish)
        {
            query = query.Where(b => b.SpanishName == null || b.SpanishName == "");
        }

        var rows = await query.OrderBy(b => b.Id).ToListAsync(ct);
        var term = q?.Trim().ToLowerInvariant();
        var items = rows
            .Select(b => new BlockNameResponse(b.Id, BlockCatalog.EnglishName(b.Id), b.SpanishName))
            .Where(b => term is null or ""
                || b.Id.Contains(term, StringComparison.OrdinalIgnoreCase)
                || b.EnglishName.Contains(term, StringComparison.OrdinalIgnoreCase)
                || (b.SpanishName?.Contains(term, StringComparison.OrdinalIgnoreCase) ?? false))
            .ToList();

        return items;
    }

    /// <summary>Pone o borra (null o vacío) el nombre en español de un bloque. Usa el nombre corto, p. ej. "stone".</summary>
    [HttpPut("{name}")]
    public async Task<ActionResult<BlockNameResponse>> SetSpanishName(
        string name, SpanishNameRequest request, CancellationToken ct)
    {
        var id = "minecraft:" + name.Trim();
        var block = await db.BlockNames.FirstOrDefaultAsync(b => b.Id == id, ct);
        if (block is null)
        {
            return NotFound();
        }

        var spanish = request.SpanishName?.Trim();
        if (spanish is { Length: > 100 })
        {
            return ValidationProblem("El nombre no puede superar 100 caracteres.");
        }

        block.SpanishName = string.IsNullOrEmpty(spanish) ? null : spanish;
        await db.SaveChangesAsync(ct);

        return new BlockNameResponse(block.Id, BlockCatalog.EnglishName(block.Id), block.SpanishName);
    }
}
