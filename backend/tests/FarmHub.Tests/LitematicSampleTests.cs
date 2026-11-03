using FarmHub.Infrastructure.Structures;
using Xunit.Abstractions;

namespace FarmHub.Tests;

/// <summary>
/// Lee los archivos .litematic reales de la carpeta "archivos .litematic" del repositorio.
/// Valida los supuestos de formato (orden de índices y empaquetado) con datos de Litematica.
/// </summary>
public sealed class LitematicSampleTests(ITestOutputHelper output)
{
    private static string? FindSampleDirectory()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            var candidate = Path.Combine(dir.FullName, "archivos .litematic");
            if (Directory.Exists(candidate))
            {
                return candidate;
            }
            dir = dir.Parent;
        }
        return null;
    }

    private static bool IsStructure(string path) =>
        Path.GetExtension(path).ToLowerInvariant() is ".litematic" or ".schem" or ".nbt";

    public static IEnumerable<object[]> SampleFiles()
    {
        var dir = FindSampleDirectory();
        if (dir is null)
        {
            yield break;
        }
        foreach (var file in Directory.GetFiles(dir).Where(f => IsStructure(f)).OrderBy(f => f))
        {
            yield return [Path.GetFileName(file)];
        }
    }

    [Theory]
    [MemberData(nameof(SampleFiles))]
    public void Sample_litematic_is_read_with_consistent_block_data(string fileName)
    {
        var path = Path.Combine(FindSampleDirectory()!, fileName);
        using var stream = File.OpenRead(path);

        var kind = Path.GetExtension(fileName).ToLowerInvariant() switch
        {
            ".schem" => FarmHub.Domain.Enums.DesignFileKind.Schematic,
            ".nbt" => FarmHub.Domain.Enums.DesignFileKind.Structure,
            _ => FarmHub.Domain.Enums.DesignFileKind.Litematic,
        };
        var model = StructureFileReader.Read(kind, stream);

        Assert.NotEmpty(model.Regions);
        foreach (var region in model.Regions)
        {
            Assert.Equal(region.Volume, region.PaletteIndices.Length);
            Assert.All(region.Palette, name => Assert.Contains(':', name));

            // Un empaquetado incorrecto suele producir bloques "aire" en casi todo o índices
            // sin sentido. Aquí solo registramos la distribución para revisarla a mano.
            var counts = region.PaletteIndices
                .GroupBy(i => region.Palette[i])
                .OrderByDescending(g => g.Count())
                .Take(5)
                .Select(g => $"{g.Key}={g.Count()}");

            output.WriteLine($"{fileName} | region '{region.Name}' | size {region.SizeX}x{region.SizeY}x{region.SizeZ} " +
                             $"| palette {region.Palette.Count} | top: {string.Join(", ", counts)}");
        }
    }
}
