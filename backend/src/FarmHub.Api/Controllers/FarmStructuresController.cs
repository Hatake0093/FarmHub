using FarmHub.Api.Contracts;
using FarmHub.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FarmHub.Api.Controllers;

/// <summary>Vincula esquemáticos propios a una granja. El esquemático sigue existiendo al desvincularlo.</summary>
[ApiController]
[Route("api/farms/{farmId:int}/structures")]
public sealed class FarmStructuresController(FarmHubDbContext db) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult> Link(int farmId, LinkStructureRequest request, CancellationToken ct)
    {
        var farm = await db.Farms.Include(f => f.Structures).FirstOrDefaultAsync(f => f.Id == farmId, ct);
        if (farm is null)
        {
            return NotFound();
        }

        if (farm.Structures.Any(s => s.Id == request.StructureId))
        {
            return ValidationProblem("Ese esquemático ya está vinculado a la granja.");
        }

        var structure = await db.SavedStructures.FirstOrDefaultAsync(s => s.Id == request.StructureId, ct);
        if (structure is null)
        {
            return ValidationProblem("El esquemático indicado no existe.");
        }

        farm.Structures.Add(structure);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("{structureId:int}")]
    public async Task<IActionResult> Unlink(int farmId, int structureId, CancellationToken ct)
    {
        var farm = await db.Farms.Include(f => f.Structures).FirstOrDefaultAsync(f => f.Id == farmId, ct);
        if (farm is null)
        {
            return NotFound();
        }

        var structure = farm.Structures.FirstOrDefault(s => s.Id == structureId);
        if (structure is null)
        {
            return NotFound();
        }

        farm.Structures.Remove(structure);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
