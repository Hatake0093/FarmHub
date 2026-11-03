using FarmHub.Api.Contracts;
using FarmHub.Domain.Entities;
using FarmHub.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FarmHub.Api.Controllers;

[ApiController]
[Route("api/authors")]
public sealed class AuthorsController(FarmHubDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AuthorResponse>>> List(CancellationToken ct) =>
        await db.Authors
            .AsNoTracking()
            .OrderBy(a => a.Name)
            .Select(a => new AuthorResponse(a.Id, a.Name, a.Url))
            .ToListAsync(ct);

    [HttpPost]
    public async Task<ActionResult<AuthorResponse>> Create(AuthorRequest request, CancellationToken ct)
    {
        var name = request.Name?.Trim();
        if (string.IsNullOrEmpty(name) || name.Length > 200)
        {
            return ValidationProblem("El nombre del autor es obligatorio y no puede superar 200 caracteres.");
        }

        var author = new Author
        {
            Name = name,
            Url = request.Url?.Trim() is { Length: > 0 } url ? url : null,
        };
        db.Authors.Add(author);
        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(List), new AuthorResponse(author.Id, author.Name, author.Url));
    }
}
