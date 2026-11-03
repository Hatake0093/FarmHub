using System.Reflection;
using FarmHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FarmHub.Infrastructure.Catalog;

/// <summary>Carga la lista curada de bloques y añade al catálogo los que falten, sin tocar los nombres ya escritos.</summary>
public static class BlockCatalog
{
    public static IReadOnlyList<string> LoadIds() => LoadIds("FarmHub.common-blocks.txt");

    /// <summary>Lee una lista curada embebida y devuelve identificadores con el prefijo minecraft:.</summary>
    public static IReadOnlyList<string> LoadIds(string resourceName)
    {
        using var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream(resourceName)
            ?? throw new InvalidOperationException($"Falta el recurso {resourceName}.");
        using var reader = new StreamReader(stream);

        var ids = new List<string>();
        while (reader.ReadLine() is { } line)
        {
            var trimmed = line.Trim();
            if (trimmed.Length == 0 || trimmed.StartsWith('#'))
            {
                continue;
            }
            ids.Add("minecraft:" + trimmed);
        }
        return ids.Distinct().ToList();
    }

    /// <summary>Nombre legible en inglés derivado del identificador: "polished_andesite" -> "Polished Andesite".</summary>
    public static string EnglishName(string id)
    {
        var name = id.StartsWith("minecraft:", StringComparison.Ordinal) ? id["minecraft:".Length..] : id;
        return string.Join(' ', name.Split('_', StringSplitOptions.RemoveEmptyEntries)
            .Select(w => char.ToUpperInvariant(w[0]) + w[1..]));
    }

    public static async Task SeedAsync(FarmHubDbContext db, CancellationToken ct = default)
    {
        var existing = await db.BlockNames.Select(b => b.Id).ToHashSetAsync(ct);
        var missing = LoadIds().Where(id => !existing.Contains(id)).ToList();
        if (missing.Count > 0)
        {
            db.BlockNames.AddRange(missing.Select(id => new Domain.Entities.BlockName { Id = id }));
        }

        var existingItems = await db.ItemNames.Select(i => i.Id).ToHashSetAsync(ct);
        var missingItems = LoadIds("FarmHub.common-items.txt").Where(id => !existingItems.Contains(id)).ToList();
        if (missingItems.Count > 0)
        {
            db.ItemNames.AddRange(missingItems.Select(id => new Domain.Entities.ItemName { Id = id }));
        }

        if (missing.Count > 0 || missingItems.Count > 0)
        {
            await db.SaveChangesAsync(ct);
        }
    }
}
