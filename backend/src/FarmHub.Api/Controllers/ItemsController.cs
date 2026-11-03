using FarmHub.Api.Contracts;
using FarmHub.Infrastructure.Catalog;
using FarmHub.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FarmHub.Api.Controllers;

/// <summary>Catálogo de items: nombre en español y color editables. Se pueden añadir más en common-items.txt.</summary>
[ApiController]
[Route("api/items")]
public sealed class ItemsController(FarmHubDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ItemNameResponse>>> List(
        [FromQuery] string? q, CancellationToken ct)
    {
        var rows = await db.ItemNames.AsNoTracking().OrderBy(i => i.Id).ToListAsync(ct);
        var term = q?.Trim().ToLowerInvariant();
        return rows
            .Select(i => new ItemNameResponse(i.Id, BlockCatalog.EnglishName(i.Id), i.SpanishName, i.Color))
            .Where(i => string.IsNullOrEmpty(term)
                || i.Id.Contains(term, StringComparison.OrdinalIgnoreCase)
                || i.EnglishName.Contains(term, StringComparison.OrdinalIgnoreCase)
                || (i.SpanishName?.Contains(term, StringComparison.OrdinalIgnoreCase) ?? false))
            .ToList();
    }

    [HttpPut("{name}")]
    public async Task<ActionResult<ItemNameResponse>> Update(string name, SpanishNameRequest request, CancellationToken ct)
    {
        var id = "minecraft:" + name.Trim();
        var item = await db.ItemNames.FirstOrDefaultAsync(i => i.Id == id, ct);
        if (item is null)
        {
            return NotFound();
        }

        var spanish = request.SpanishName?.Trim();
        if (spanish is { Length: > 100 })
        {
            return ValidationProblem("El nombre no puede superar 100 caracteres.");
        }

        item.SpanishName = string.IsNullOrEmpty(spanish) ? null : spanish;
        if (!string.IsNullOrWhiteSpace(request.Color) && BlocksController.NormalizeColor(request.Color) is null)
        {
            return ValidationProblem("El color debe tener formato #rrggbb, por ejemplo #8a8a8a.");
        }
        item.Color = BlocksController.NormalizeColor(request.Color);
        await db.SaveChangesAsync(ct);

        return new ItemNameResponse(item.Id, BlockCatalog.EnglishName(item.Id), item.SpanishName, item.Color);
    }

    /// <summary>Añade un item nuevo al catálogo, con identificador sin prefijo (p. ej. "netherite_sword").</summary>
    [HttpPost]
    public async Task<ActionResult<ItemNameResponse>> Add(NewItemRequest request, CancellationToken ct)
    {
        var name = request.Name?.Trim().ToLowerInvariant() ?? "";
        if (!System.Text.RegularExpressions.Regex.IsMatch(name, "^[a-z0-9_]{1,80}$"))
        {
            return ValidationProblem("El identificador solo admite letras minúsculas, números y guiones bajos.");
        }
        var id = "minecraft:" + name;
        if (await db.ItemNames.AnyAsync(i => i.Id == id, ct))
        {
            return Conflict(new Microsoft.AspNetCore.Mvc.ProblemDetails { Title = "Ese item ya está en el catálogo." });
        }

        var item = new Domain.Entities.ItemName { Id = id, SpanishName = null, Color = null };
        db.ItemNames.Add(item);
        await db.SaveChangesAsync(ct);
        return StatusCode(StatusCodes.Status201Created,
            new ItemNameResponse(item.Id, BlockCatalog.EnglishName(item.Id), null, null));
    }
}
