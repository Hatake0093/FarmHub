using FarmHub.Domain.Entities;
using FarmHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FarmHub.Tests;

public sealed class FarmLibrarySchemaTests
{
    private static FarmHubDbContext CreateContext()
    {
        // No se abre conexión: solo se construye el modelo.
        var options = new DbContextOptionsBuilder<FarmHubDbContext>()
            .UseNpgsql("Host=localhost;Database=unused")
            .Options;
        return new FarmHubDbContext(options);
    }

    [Fact]
    public void Model_contains_library_entities()
    {
        using var context = CreateContext();

        var types = context.Model.GetEntityTypes().Select(t => t.ClrType).ToHashSet();

        Assert.Contains(typeof(Farm), types);
        Assert.Contains(typeof(Category), types);
        Assert.Contains(typeof(Author), types);
        Assert.Contains(typeof(MinecraftVersion), types);
        Assert.Contains(typeof(Tag), types);
    }

    [Fact]
    public void Farm_requires_category_and_author_is_optional()
    {
        using var context = CreateContext();
        var farm = context.Model.FindEntityType(typeof(Farm))!;

        var categoryFk = farm.FindNavigation(nameof(Farm.Category))!.ForeignKey;
        var authorFk = farm.FindNavigation(nameof(Farm.Author))!.ForeignKey;

        Assert.True(categoryFk.IsRequired);
        Assert.False(authorFk.IsRequired);
    }
}
