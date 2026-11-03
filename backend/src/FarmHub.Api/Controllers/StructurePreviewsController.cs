using FarmHub.Api.Contracts;
using FarmHub.Domain.Litematic;
using FarmHub.Domain.Rules;
using FarmHub.Infrastructure.Structures;
using Microsoft.AspNetCore.Mvc;

namespace FarmHub.Api.Controllers;

/// <summary>
/// Lee un .litematic, .schem o .nbt y devuelve su resumen y su volumen sin guardar nada en la base de datos.
/// </summary>
[ApiController]
[Route("api/structure-previews")]
public sealed class StructurePreviewsController : ControllerBase
{
    [HttpPost]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(25L * 1024 * 1024)]
    public ActionResult<StructurePreviewResponse> Preview(IFormFile file)
    {
        if (file.Length == 0)
        {
            return ValidationProblem("El archivo está vacío.");
        }
        if (!DesignFileRules.TryGetKind(file.FileName, out var kind) || !StructureFileReader.IsStructureKind(kind))
        {
            return ValidationProblem("Solo se pueden previsualizar .litematic, .schem o .nbt.");
        }

        LitematicModel model;
        try
        {
            using var stream = file.OpenReadStream();
            model = StructureFileReader.Read(kind, stream);
        }
        catch (LitematicFormatException ex)
        {
            return ValidationProblem($"Archivo no válido: {ex.Message}");
        }

        var volumes = model.Regions
            .Where(r => r.Volume <= VolumeEncoder.MaxCells)
            .Select(r => new RegionVolumeResponse(r.Name, LitematicsController.BuildVolume(r)))
            .ToList();

        return new StructurePreviewResponse(LitematicsController.BuildSummary(model), volumes);
    }
}
