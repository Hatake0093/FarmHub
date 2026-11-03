using FarmHub.Api.Contracts;
using FarmHub.Domain.Entities;
using FarmHub.Domain.Rules;
using FarmHub.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FarmHub.Api.Controllers;

[ApiController]
[Route("api")]
public sealed class FarmDependenciesController(FarmHubDbContext db) : ControllerBase
{
    private const int MaxNoteLength = 500;

    [HttpPost("farms/{farmId:int}/dependencies")]
    public async Task<ActionResult<FarmRelationResponse>> Add(
        int farmId, FarmDependencyRequest request, CancellationToken ct)
    {
        if (!await db.Farms.AnyAsync(f => f.Id == farmId, ct))
        {
            return NotFound();
        }

        if (!await db.Farms.AnyAsync(f => f.Id == request.RequiredFarmId, ct))
        {
            return ValidationProblem("La granja requerida no existe.");
        }

        if (request.Note is { Length: > MaxNoteLength })
        {
            return ValidationProblem($"La nota no puede superar {MaxNoteLength} caracteres.");
        }

        if (await db.FarmDependencies.AnyAsync(d => d.FarmId == farmId && d.RequiredFarmId == request.RequiredFarmId, ct))
        {
            return ValidationProblem("Esa dependencia ya existe.");
        }

        var edges = await db.FarmDependencies
            .AsNoTracking()
            .GroupBy(d => d.FarmId)
            .Select(g => new { FarmId = g.Key, Requires = g.Select(d => d.RequiredFarmId).ToList() })
            .ToListAsync(ct);
        var requiresByFarm = edges.ToDictionary(e => e.FarmId, e => (IReadOnlyCollection<int>)e.Requires);

        if (DependencyRules.WouldCreateCycle(farmId, request.RequiredFarmId, requiresByFarm))
        {
            return ValidationProblem("Esta dependencia crearía un ciclo: la granja requerida ya depende de esta granja.");
        }

        var dependency = new FarmDependency
        {
            FarmId = farmId,
            RequiredFarmId = request.RequiredFarmId,
            Note = request.Note?.Trim(),
        };
        db.FarmDependencies.Add(dependency);
        await db.SaveChangesAsync(ct);

        var required = await db.Farms.AsNoTracking().FirstAsync(f => f.Id == request.RequiredFarmId, ct);
        return StatusCode(StatusCodes.Status201Created,
            new FarmRelationResponse(dependency.Id, required.Id, required.Name, dependency.Note));
    }

    [HttpDelete("farm-dependencies/{id:int}")]
    public async Task<IActionResult> Remove(int id, CancellationToken ct)
    {
        var dependency = await db.FarmDependencies.FirstOrDefaultAsync(d => d.Id == id, ct);
        if (dependency is null)
        {
            return NotFound();
        }

        db.FarmDependencies.Remove(dependency);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
