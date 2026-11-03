using FarmHub.Api.Contracts;
using FarmHub.Domain.Entities;
using FarmHub.Domain.Enums;
using FarmHub.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FarmHub.Api.Controllers;

[ApiController]
[Route("api")]
public sealed class FarmLinksController(FarmHubDbContext db) : ControllerBase
{
    [HttpPost("farms/{farmId:int}/links")]
    public async Task<ActionResult<FarmLinkResponse>> Add(int farmId, FarmLinkRequest request, CancellationToken ct)
    {
        if (!await db.Farms.AnyAsync(f => f.Id == farmId, ct))
        {
            return NotFound();
        }

        var title = request.Title?.Trim();
        if (string.IsNullOrEmpty(title) || title.Length > 200)
        {
            return ValidationProblem("El título es obligatorio y no puede superar 200 caracteres.");
        }

        if (!Uri.TryCreate(request.Url?.Trim(), UriKind.Absolute, out var uri)
            || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)
            || uri.AbsoluteUri.Length > 2000)
        {
            return ValidationProblem("La URL debe ser absoluta y empezar por http:// o https://.");
        }

        if (!Enum.TryParse<FarmLinkKind>(request.Kind, ignoreCase: true, out var kind) || !Enum.IsDefined(kind))
        {
            return ValidationProblem("El tipo debe ser Tutorial o Reference.");
        }

        var link = new FarmLink
        {
            FarmId = farmId,
            Title = title,
            Url = uri.AbsoluteUri,
            Kind = kind,
        };
        db.FarmLinks.Add(link);
        await db.SaveChangesAsync(ct);

        return StatusCode(StatusCodes.Status201Created, FarmLinkMapping.From(link));
    }

    [HttpDelete("farm-links/{id:int}")]
    public async Task<IActionResult> Remove(int id, CancellationToken ct)
    {
        var link = await db.FarmLinks.FirstOrDefaultAsync(l => l.Id == id, ct);
        if (link is null)
        {
            return NotFound();
        }

        db.FarmLinks.Remove(link);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
