using FarmHub.Api.Contracts;
using FarmHub.Domain.Entities;
using FarmHub.Domain.Enums;
using FarmHub.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FarmHub.Api.Controllers;

[ApiController]
[Route("api")]
public sealed class FarmProductionsController(FarmHubDbContext db) : ControllerBase
{
    private const decimal MaxAmountPerHour = 1_000_000m;

    [HttpPost("farms/{farmId:int}/productions")]
    public async Task<ActionResult<FarmProductionResponse>> Add(
        int farmId, FarmProductionRequest request, CancellationToken ct)
    {
        if (!await db.Farms.AnyAsync(f => f.Id == farmId, ct))
        {
            return NotFound();
        }

        var validation = await ValidateAsync(request, ct);
        if (validation.Problem is not null)
        {
            return validation.Problem;
        }

        var production = new FarmProduction
        {
            FarmId = farmId,
            ResourceName = request.ResourceName.Trim(),
            AmountPerHour = request.AmountPerHour,
            Unit = validation.Unit,
            RequiresAfk = request.RequiresAfk,
            MeasurementConditions = request.MeasurementConditions?.Trim(),
            Source = request.Source?.Trim(),
            MeasuredInVersionId = request.MeasuredInVersionId,
        };
        db.FarmProductions.Add(production);
        await db.SaveChangesAsync(ct);

        return StatusCode(StatusCodes.Status201Created, await LoadAsync(production.Id, ct));
    }

    [HttpPut("farm-productions/{id:int}")]
    public async Task<ActionResult<FarmProductionResponse>> Update(
        int id, FarmProductionRequest request, CancellationToken ct)
    {
        var production = await db.FarmProductions.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (production is null)
        {
            return NotFound();
        }

        var validation = await ValidateAsync(request, ct);
        if (validation.Problem is not null)
        {
            return validation.Problem;
        }

        production.ResourceName = request.ResourceName.Trim();
        production.AmountPerHour = request.AmountPerHour;
        production.Unit = validation.Unit;
        production.RequiresAfk = request.RequiresAfk;
        production.MeasurementConditions = request.MeasurementConditions?.Trim();
        production.Source = request.Source?.Trim();
        production.MeasuredInVersionId = request.MeasuredInVersionId;
        await db.SaveChangesAsync(ct);

        var updated = await LoadAsync(id, ct);
        return updated is null ? NotFound() : updated;
    }

    [HttpDelete("farm-productions/{id:int}")]
    public async Task<IActionResult> Remove(int id, CancellationToken ct)
    {
        var production = await db.FarmProductions.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (production is null)
        {
            return NotFound();
        }

        db.FarmProductions.Remove(production);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private async Task<(ActionResult? Problem, ProductionUnit Unit)> ValidateAsync(
        FarmProductionRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.ResourceName) || request.ResourceName.Trim().Length > 200)
        {
            return (ValidationProblem("El recurso es obligatorio y no puede superar 200 caracteres."), default);
        }

        if (request.AmountPerHour <= 0 || request.AmountPerHour > MaxAmountPerHour)
        {
            return (ValidationProblem("La producción por hora debe ser mayor que 0."), default);
        }

        if (!Enum.TryParse<ProductionUnit>(request.Unit, ignoreCase: true, out var unit) || !Enum.IsDefined(unit))
        {
            return (ValidationProblem("La unidad debe ser Items o Stacks."), default);
        }

        if (request.MeasurementConditions is { Length: > 2000 } || request.Source is { Length: > 500 })
        {
            return (ValidationProblem("Las condiciones de medición no pueden superar 2000 caracteres y la fuente 500."), default);
        }

        if (request.MeasuredInVersionId is { } versionId && !await db.MinecraftVersions.AnyAsync(v => v.Id == versionId, ct))
        {
            return (ValidationProblem("La versión de medición no existe."), default);
        }

        return (null, unit);
    }

    private async Task<FarmProductionResponse?> LoadAsync(int id, CancellationToken ct)
    {
        var production = await db.FarmProductions
            .AsNoTracking()
            .Include(p => p.MeasuredInVersion)
            .FirstOrDefaultAsync(p => p.Id == id, ct);

        return production is null ? null : FarmProductionMapping.From(production);
    }
}
