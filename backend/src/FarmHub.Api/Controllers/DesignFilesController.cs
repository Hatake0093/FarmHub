using FarmHub.Domain.Storage;
using FarmHub.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FarmHub.Api.Controllers;

[ApiController]
[Route("api/design-files")]
public sealed class DesignFilesController(FarmHubDbContext db, IFileStorage storage) : ControllerBase
{
    [HttpGet("{id:int}/download")]
    public async Task<IActionResult> Download(int id, CancellationToken ct)
    {
        var file = await db.DesignFiles.AsNoTracking().FirstOrDefaultAsync(f => f.Id == id, ct);
        if (file is null)
        {
            return NotFound();
        }

        var stream = storage.OpenRead(file.StorageKey);
        return File(stream, file.ContentType, file.OriginalFileName);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var file = await db.DesignFiles.FirstOrDefaultAsync(f => f.Id == id, ct);
        if (file is null)
        {
            return NotFound();
        }

        var storageKey = file.StorageKey;
        db.DesignFiles.Remove(file);
        await db.SaveChangesAsync(ct);

        storage.Delete(storageKey);
        return NoContent();
    }
}
