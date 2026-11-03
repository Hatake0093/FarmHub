using FarmHub.Api.Contracts;
using FarmHub.Domain.Entities;
using FarmHub.Infrastructure.Catalog;
using FarmHub.Domain.Storage;
using FarmHub.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FarmHub.Api.Controllers;

/// <summary>Catálogo de bloques con nombres en español editables.</summary>
[ApiController]
[Route("api/blocks")]
public sealed class BlocksController(FarmHubDbContext db, IFileStorage storage) : ControllerBase
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
            .Select(ToResponse)
            .Where(b => term is null or ""
                || b.Id.Contains(term, StringComparison.OrdinalIgnoreCase)
                || b.EnglishName.Contains(term, StringComparison.OrdinalIgnoreCase)
                || (b.SpanishName?.Contains(term, StringComparison.OrdinalIgnoreCase) ?? false))
            .ToList();

        return items;
    }

    /// <summary>Añade un bloque al catálogo, con identificador sin prefijo (p. ej. "cherry_sign").</summary>
    [HttpPost]
    public async Task<ActionResult<BlockNameResponse>> Add(NewItemRequest request, CancellationToken ct)
    {
        var name = request.Name?.Trim().ToLowerInvariant() ?? "";
        if (!System.Text.RegularExpressions.Regex.IsMatch(name, "^[a-z0-9_]{1,80}$"))
        {
            return ValidationProblem("El identificador solo admite letras minúsculas, números y guiones bajos.");
        }
        var id = "minecraft:" + name;
        if (await db.BlockNames.AnyAsync(b => b.Id == id, ct))
        {
            return Conflict(new ProblemDetails { Title = "Ese bloque ya está en el catálogo." });
        }

        var block = new BlockName { Id = id };
        db.BlockNames.Add(block);
        await db.SaveChangesAsync(ct);
        return StatusCode(StatusCodes.Status201Created,
            ToResponse(block));
    }

    /// <summary>Acepta #rrggbb (en minúsculas) o null para volver al color automático.</summary>
    public static string? NormalizeColor(string? color)
    {
        if (string.IsNullOrWhiteSpace(color))
        {
            return null;
        }
        var value = color.Trim().ToLowerInvariant();
        return System.Text.RegularExpressions.Regex.IsMatch(value, "^#[0-9a-f]{6}$") ? value : null;
    }

    /// <summary>Pone o borra (null o vacío) el nombre en español y el color de un bloque. Usa el nombre corto, p. ej. "stone".</summary>
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
        if (!string.IsNullOrWhiteSpace(request.Color) && NormalizeColor(request.Color) is null)
        {
            return ValidationProblem("El color debe tener formato #rrggbb, por ejemplo #8a8a8a.");
        }
        block.Color = NormalizeColor(request.Color);
        await db.SaveChangesAsync(ct);

        return ToResponse(block);
    }

    /// <summary>Sube la textura de los lados del bloque (PNG, JPEG o WebP). Reemplaza la anterior.</summary>
    [HttpPut("{name}/texture")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(MaxTextureBytes)]
    public Task<ActionResult<BlockNameResponse>> UploadTexture(string name, IFormFile file, CancellationToken ct) =>
        UploadFaceAsync(name, TextureFace.Side, file, ct);

    /// <summary>Sube la textura de una cara concreta: "side", "top" o "bottom".</summary>
    [HttpPut("{name}/texture/{face}")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(MaxTextureBytes)]
    public Task<ActionResult<BlockNameResponse>> UploadFaceTexture(string name, string face, IFormFile file, CancellationToken ct) =>
        TryFace(face, out var parsed)
            ? UploadFaceAsync(name, parsed, file, ct)
            : Task.FromResult<ActionResult<BlockNameResponse>>(ValidationProblem("La cara debe ser side, top o bottom."));

    [HttpGet("{name}/texture")]
    public Task<IActionResult> GetTexture(string name, CancellationToken ct) => GetFaceAsync(name, TextureFace.Side, ct);

    [HttpGet("{name}/texture/{face}")]
    public Task<IActionResult> GetFaceTexture(string name, string face, CancellationToken ct) =>
        TryFace(face, out var parsed) ? GetFaceAsync(name, parsed, ct) : Task.FromResult<IActionResult>(ValidationProblem("La cara debe ser side, top o bottom."));

    [HttpDelete("{name}/texture")]
    public Task<IActionResult> DeleteTexture(string name, CancellationToken ct) => DeleteFaceAsync(name, TextureFace.Side, ct);

    [HttpDelete("{name}/texture/{face}")]
    public Task<IActionResult> DeleteFaceTexture(string name, string face, CancellationToken ct) =>
        TryFace(face, out var parsed) ? DeleteFaceAsync(name, parsed, ct) : Task.FromResult<IActionResult>(ValidationProblem("La cara debe ser side, top o bottom."));

    private async Task<ActionResult<BlockNameResponse>> UploadFaceAsync(string name, TextureFace face, IFormFile file, CancellationToken ct)
    {
        var id = "minecraft:" + name.Trim();
        var block = await db.BlockNames.FirstOrDefaultAsync(b => b.Id == id, ct);
        if (block is null)
        {
            return NotFound();
        }

        if (file.Length == 0 || file.Length > MaxTextureBytes)
        {
            return ValidationProblem($"La textura debe pesar entre 1 byte y {MaxTextureBytes / 1024} KB.");
        }

        var header = new byte[32];
        await using (var check = file.OpenReadStream())
        {
            var read = await check.ReadAsync(header.AsMemory(0, header.Length), ct);
            if (!IsSupportedImage(header, read, out var problem))
            {
                return ValidationProblem(problem);
            }
        }

        StoredFile stored;
        await using (var stream = file.OpenReadStream())
        {
            stored = await storage.SaveAsync(stream, ct);
        }

        var previousKey = BlockNameTextures.KeyOf(block, face);
        BlockNameTextures.SetKey(block, face, stored.StorageKey);
        await db.SaveChangesAsync(ct);
        if (previousKey is not null)
        {
            storage.Delete(previousKey);
        }

        return ToResponse(block);
    }

    private async Task<IActionResult> GetFaceAsync(string name, TextureFace face, CancellationToken ct)
    {
        var id = "minecraft:" + name.Trim();
        var block = await db.BlockNames.AsNoTracking().FirstOrDefaultAsync(b => b.Id == id, ct);
        var key = block is null ? null : BlockNameTextures.KeyOf(block, face);
        if (key is null)
        {
            return NotFound();
        }

        var stream = storage.OpenRead(key);
        var header = new byte[8];
        var read = await stream.ReadAsync(header.AsMemory(0, header.Length), ct);
        stream.Position = 0;
        return File(stream, DetectContentType(header, read), enableRangeProcessing: false);
    }

    private async Task<IActionResult> DeleteFaceAsync(string name, TextureFace face, CancellationToken ct)
    {
        var id = "minecraft:" + name.Trim();
        var block = await db.BlockNames.FirstOrDefaultAsync(b => b.Id == id, ct);
        if (block is null)
        {
            return NotFound();
        }

        var key = BlockNameTextures.KeyOf(block, face);
        BlockNameTextures.SetKey(block, face, null);
        await db.SaveChangesAsync(ct);
        if (key is not null)
        {
            storage.Delete(key);
        }
        return NoContent();
    }

    private static bool TryFace(string face, out TextureFace parsed) => BlockNameTextures.TryParse(face, out parsed);

    private static BlockNameResponse ToResponse(BlockName block)
    {
        var faces = BlockNameTextures.Faces(block);
        return new BlockNameResponse(
            block.Id,
            BlockCatalog.EnglishName(block.Id),
            block.SpanishName,
            block.Color,
            faces.Count > 0,
            faces);
    }

    private const long MaxTextureBytes = 256 * 1024;
    private const int MaxTextureSide = 256;

    /// <summary>Comprueba la firma del archivo y, en PNG, que no supere 256 píxeles por lado.</summary>
    public static bool IsSupportedImage(byte[] header, int length, out string problem)
    {
        problem = "";
        if (IsPng(header, length))
        {
            if (length < 24)
            {
                problem = "La imagen PNG no es válida.";
                return false;
            }
            var width = (header[16] << 24) | (header[17] << 16) | (header[18] << 8) | header[19];
            var height = (header[20] << 24) | (header[21] << 16) | (header[22] << 8) | header[23];
            if (width < 1 || height < 1 || width > MaxTextureSide || height > MaxTextureSide)
            {
                problem = $"La imagen debe medir como máximo {MaxTextureSide} × {MaxTextureSide} píxeles.";
                return false;
            }
            return true;
        }
        if (IsJpeg(header, length) || IsWebp(header, length))
        {
            return true;
        }
        problem = "Formato no admitido. Usa PNG, JPEG o WebP.";
        return false;
    }

    private static bool IsPng(byte[] h, int n) => n >= 8 && h[0] == 0x89 && h[1] == 0x50 && h[2] == 0x4E && h[3] == 0x47;
    private static bool IsJpeg(byte[] h, int n) => n >= 3 && h[0] == 0xFF && h[1] == 0xD8 && h[2] == 0xFF;
    private static bool IsWebp(byte[] h, int n) =>
        n >= 12 && h[0] == 'R' && h[1] == 'I' && h[2] == 'F' && h[3] == 'F' && h[8] == 'W' && h[9] == 'E' && h[10] == 'B' && h[11] == 'P';

    private static string DetectContentType(byte[] header, int length) =>
        IsPng(header, length) ? "image/png" : IsJpeg(header, length) ? "image/jpeg" : IsWebp(header, length) ? "image/webp" : "application/octet-stream";
}
