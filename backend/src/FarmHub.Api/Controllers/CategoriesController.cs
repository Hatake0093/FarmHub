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

    [HttpPut("{id:int}")]
    public async Task<ActionResult<CategoryResponse>> Update(int id, CategoryRequest request, CancellationToken ct)
    {
        var category = await db.Categories.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (category is null)
        {
            return NotFound();
        }

        var name = request.Name?.Trim();
        if (string.IsNullOrEmpty(name) || name.Length > 100)
        {
            return ValidationProblem("El nombre de la categoría es obligatorio y no puede superar 100 caracteres.");
        }

        if (await db.Categories.AnyAsync(c => c.Name == name && c.Id != id, ct))
        {
            return Conflict(new ProblemDetails { Title = "Ya existe una categoría con ese nombre." });
        }

        category.Name = name;
        category.Description = request.Description?.Trim();
        await db.SaveChangesAsync(ct);

        return new CategoryResponse(category.Id, category.Name, category.Description);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var category = await db.Categories.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (category is null)
        {
            return NotFound();
        }

        // No se borra una categoría con granjas: el usuario debe moverlas o borrarlas antes.
        var farmCount = await db.Farms.CountAsync(f => f.CategoryId == id, ct);
        if (farmCount > 0)
        {
            return Conflict(new ProblemDetails
            {
                Title = $"La categoría tiene {farmCount} granjas. Cámbialas de categoría o bórralas antes.",
            });
        }

        db.Categories.Remove(category);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
