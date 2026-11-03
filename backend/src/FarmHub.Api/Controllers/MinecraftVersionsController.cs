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
}
