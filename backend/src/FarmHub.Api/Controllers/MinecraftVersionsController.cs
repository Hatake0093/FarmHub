using FarmHub.Api.Contracts;
using FarmHub.Domain.Entities;
using FarmHub.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FarmHub.Api.Controllers;

[ApiController]
[Route("api/minecraft-versions")]
public sealed class MinecraftVersionsController(FarmHubDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<MinecraftVersionResponse>>> List(CancellationToken ct) =>
        await db.MinecraftVersions
            .AsNoTracking()
            .OrderBy(v => v.Name)
            .Select(v => new MinecraftVersionResponse(v.Id, v.Name))
            .ToListAsync(ct);

    [HttpPost]
    public async Task<ActionResult<MinecraftVersionResponse>> Create(MinecraftVersionRequest request, CancellationToken ct)
    {
        var name = request.Name?.Trim();
        if (string.IsNullOrEmpty(name) || name.Length > 20)
        {
            return ValidationProblem("El nombre de la versión es obligatorio y no puede superar 20 caracteres.");
        }

        if (await db.MinecraftVersions.AnyAsync(v => v.Name == name, ct))
        {
            return Conflict(new ProblemDetails { Title = "Esa versión ya está registrada." });
        }

        var version = new MinecraftVersion { Name = name };
        db.MinecraftVersions.Add(version);
        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(List), new MinecraftVersionResponse(version.Id, version.Name));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<MinecraftVersionResponse>> Update(int id, MinecraftVersionRequest request, CancellationToken ct)
    {
        var version = await db.MinecraftVersions.FirstOrDefaultAsync(v => v.Id == id, ct);
        if (version is null)
        {
            return NotFound();
        }

        var name = request.Name?.Trim();
        if (string.IsNullOrEmpty(name) || name.Length > 20)
        {
            return ValidationProblem("El nombre de la versión es obligatorio y no puede superar 20 caracteres.");
        }

        if (await db.MinecraftVersions.AnyAsync(v => v.Name == name && v.Id != id, ct))
        {
            return Conflict(new ProblemDetails { Title = "Esa versión ya está registrada." });
        }

        version.Name = name;
        await db.SaveChangesAsync(ct);

        return new MinecraftVersionResponse(version.Id, version.Name);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var version = await db.MinecraftVersions.FirstOrDefaultAsync(v => v.Id == id, ct);
        if (version is null)
        {
            return NotFound();
        }

        var farmCount = await db.Farms.CountAsync(f => f.MinecraftVersions.Any(v => v.Id == id), ct);
        var measurementCount = await db.FarmProductions.CountAsync(p => p.MeasuredInVersionId == id, ct);
        if (farmCount > 0 || measurementCount > 0)
        {
            return Conflict(new ProblemDetails
            {
                Title = $"La versión está en uso por {farmCount} granjas y {measurementCount} producciones. Quítala de ellas antes de borrarla.",
            });
        }

        db.MinecraftVersions.Remove(version);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
