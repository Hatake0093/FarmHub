using FarmHub.Api.Contracts;
using FarmHub.Domain.Entities;
using FarmHub.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FarmHub.Api.Controllers;

[ApiController]
[Route("api/categories")]
public sealed class CategoriesController(FarmHubDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CategoryResponse>>> List(CancellationToken ct) =>
        await db.Categories
            .AsNoTracking()
            .OrderBy(c => c.Name)
            .Select(c => new CategoryResponse(c.Id, c.Name, c.Description))
            .ToListAsync(ct);

    [HttpPost]
    public async Task<ActionResult<CategoryResponse>> Create(CategoryRequest request, CancellationToken ct)
    {
        var name = request.Name?.Trim();
        if (string.IsNullOrEmpty(name) || name.Length > 100)
        {
            return ValidationProblem("El nombre de la categoría es obligatorio y no puede superar 100 caracteres.");
        }

        if (await db.Categories.AnyAsync(c => c.Name == name, ct))
        {
            return Conflict(new ProblemDetails { Title = "Ya existe una categoría con ese nombre." });
        }

        var category = new Category
        {
            Name = name,
            Description = request.Description?.Trim(),
        };
        db.Categories.Add(category);
        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(List), new CategoryResponse(category.Id, category.Name, category.Description));
    }
}
