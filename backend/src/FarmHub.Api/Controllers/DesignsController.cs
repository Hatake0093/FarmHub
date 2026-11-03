using FarmHub.Api.Contracts;
using FarmHub.Domain.Entities;
using FarmHub.Domain.Rules;
using FarmHub.Domain.Storage;
using FarmHub.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FarmHub.Api.Controllers;

[ApiController]
[Route("api/designs")]
public sealed class DesignsController(FarmHubDbContext db, IFileStorage storage) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<DesignResponse>> Create(CreateDesignRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return ValidationProblem("El nombre del diseño es obligatorio.");
        }

        if (!await db.Farms.AnyAsync(f => f.Id == request.FarmId, ct))
        {
            return ValidationProblem("La granja indicada no existe.");
        }

        if (request.AuthorId is { } authorId && !await db.Authors.AnyAsync(a => a.Id == authorId, ct))
        {
            return ValidationProblem("El autor indicado no existe.");
        }

        var design = new Design
        {
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            FarmId = request.FarmId,
            AuthorId = request.AuthorId,
        };

        db.Designs.Add(design);
        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetById), new { id = design.Id }, ToResponse(design));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<DesignResponse>> GetById(int id, CancellationToken ct)
    {
        var design = await db.Designs
            .Include(d => d.Files)
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.Id == id, ct);

        return design is null ? NotFound() : ToResponse(design);
    }

    [HttpPost("{id:int}/files")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(DesignFileRules.MaxFileSizeBytes)]
    public async Task<ActionResult<DesignFileResponse>> UploadFile(int id, IFormFile file, CancellationToken ct)
    {
        if (file.Length == 0)
        {
            return ValidationProblem("El archivo está vacío.");
        }

        if (file.Length > DesignFileRules.MaxFileSizeBytes)
        {
            return ValidationProblem("El archivo supera el tamaño máximo permitido (25 MB).");
        }

        if (!DesignFileRules.TryGetKind(file.FileName, out var kind))
        {
            return StatusCode(StatusCodes.Status415UnsupportedMediaType,
                new ProblemDetails { Title = "Tipo de archivo no admitido." });
        }

        if (!await db.Designs.AnyAsync(d => d.Id == id, ct))
        {
            return NotFound();
        }

        StoredFile stored;
        await using (var stream = file.OpenReadStream())
        {
            stored = await storage.SaveAsync(stream, ct);
        }

        var designFile = new DesignFile
        {
            DesignId = id,
            Kind = kind,
            OriginalFileName = Path.GetFileName(file.FileName),
            ContentType = file.ContentType is { Length: > 0 } ct2 ? ct2 : "application/octet-stream",
            SizeBytes = stored.SizeBytes,
            Sha256 = stored.Sha256,
            StorageKey = stored.StorageKey,
        };

        db.DesignFiles.Add(designFile);
        await db.SaveChangesAsync(ct);

        var response = new DesignFileResponse(
            designFile.Id,
            designFile.Kind.ToString(),
            designFile.OriginalFileName,
            designFile.ContentType,
            designFile.SizeBytes,
            designFile.Sha256);

        return CreatedAtAction(nameof(DesignFilesController.Download),
            "DesignFiles", new { id = designFile.Id }, response);
    }

    private static DesignResponse ToResponse(Design design) => new(
        design.Id,
        design.FarmId,
        design.Name,
        design.Description,
        design.AuthorId,
        design.Files.Select(f => new DesignFileResponse(
            f.Id, f.Kind.ToString(), f.OriginalFileName, f.ContentType, f.SizeBytes, f.Sha256)).ToList());
}
