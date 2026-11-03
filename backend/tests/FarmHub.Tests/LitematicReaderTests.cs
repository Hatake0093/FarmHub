using FarmHub.Domain.Litematic;
using FarmHub.Infrastructure.Litematic;
using fNbt;

namespace FarmHub.Tests;

/// <summary>
/// Pruebas con archivos generados en memoria. Validan la lectura interna pero NO sustituyen
/// pruebas con archivos reales de Litematica (ver supuestos en LitematicReader).
/// </summary>
public sealed class LitematicReaderTests
{
    private static readonly string[] Palette = ["minecraft:air", "minecraft:stone", "minecraft:hopper"];

    // Empaqueta índices con bits = 2 y sin cruzar longs (32 entradas por long).
    private static long[] Pack(int[] indices, int bits)
    {
        int perLong = 64 / bits;
        var data = new long[(indices.Length + perLong - 1) / perLong];
        for (int i = 0; i < indices.Length; i++)
        {
            data[i / perLong] |= (long)indices[i] << ((i % perLong) * bits);
        }
        return data;
    }

    private static NbtCompound Vector(string name, int x, int y, int z) =>
        new(name) { new NbtInt("x", x), new NbtInt("y", y), new NbtInt("z", z) };

    private static MemoryStream Build(int sizeX, int sizeY, int sizeZ, int[] indices, string[]? palette = null,
        bool omitRegions = false, long[]? overrideStates = null)
    {
        palette ??= Palette;
        var paletteList = new NbtList("BlockStatePalette", NbtTagType.Compound);
        foreach (var name in palette)
        {
            paletteList.Add(new NbtCompound { new NbtString("Name", name) });
        }

        var region = new NbtCompound("main")
        {
            Vector("Position", 10, 64, -5),
            Vector("Size", sizeX, sizeY, sizeZ),
            paletteList,
            new NbtLongArray("BlockStates", overrideStates ?? Pack(indices, 2)),
        };

        var root = new NbtCompound("")
        {
            new NbtInt("MinecraftDataVersion", 3700),
            new NbtInt("Version", 6),
            new NbtCompound("Metadata")
            {
                new NbtString("Name", "Granja de prueba"),
                new NbtString("Author", "Tester"),
                new NbtString("Description", ""),
            },
        };
        if (!omitRegions)
        {
            root.Add(new NbtCompound("Regions") { region });
        }

        var stream = new MemoryStream();
        new NbtFile(root).SaveToStream(stream, NbtCompression.GZip);
        stream.Position = 0;
        return stream;
    }

    [Fact]
    public void Reads_metadata_palette_and_block_indices()
    {
        // Volumen 2x2x2. Índice local = (y*depth + z)*width + x.
        int[] indices = [0, 1, 2, 1, 2, 2, 0, 1];
        using var stream = Build(2, 2, 2, indices);

        var model = LitematicReader.Read(stream);

        Assert.Equal("Granja de prueba", model.Name);
        Assert.Equal("Tester", model.Author);
        Assert.Null(model.Description);
        var region = Assert.Single(model.Regions);
        Assert.Equal("main", region.Name);
        Assert.Equal((10, 64, -5), (region.PositionX, region.PositionY, region.PositionZ));
        Assert.Equal(2, region.Width);
        Assert.Equal(8, region.Volume);
        Assert.Equal(Palette, region.Palette);
        Assert.Equal(indices, region.PaletteIndices);
        // (y=0, z=1, x=0) -> (0*2 + 1)*2 + 0 = 2 -> indices[2] == 2
        Assert.Equal(2, region.IndexAt(0, 0, 1));
    }

    [Fact]
    public void Negative_sizes_use_absolute_dimensions()
    {
        using var stream = Build(-2, 2, 2, [0, 0, 0, 0, 0, 0, 0, 0]);

        var region = Assert.Single(LitematicReader.Read(stream).Regions);

        Assert.Equal(-2, region.SizeX);
        Assert.Equal(2, region.Width);
        Assert.Equal(8, region.Volume);
    }

    [Fact]
    public void Rejects_invalid_gzip()
    {
        using var stream = new MemoryStream("no soy un archivo"u8.ToArray());

        Assert.Throws<LitematicFormatException>(() => LitematicReader.Read(stream));
    }

    [Fact]
    public void Rejects_file_without_regions()
    {
        using var stream = Build(1, 1, 1, [0], omitRegions: true);

        Assert.Throws<LitematicFormatException>(() => LitematicReader.Read(stream));
    }

    [Fact]
    public void Rejects_palette_index_out_of_range()
    {
        // Paleta de 3 entradas con bits=2 puede codificar 3 (fuera de rango).
        using var stream = Build(1, 1, 2, [0, 3]);

        Assert.Throws<LitematicFormatException>(() => LitematicReader.Read(stream));
    }

    [Fact]
    public void Rejects_region_above_volume_limit()
    {
        // 5000^3 supera el volumen máximo; se rechaza antes de desempaquetar los bloques.
        using var big = Build(5000, 5000, 5000, [], overrideStates: [0]);

        Assert.Throws<LitematicFormatException>(() => LitematicReader.Read(big));
    }

    [Fact]
    public void Rejects_short_block_states_array()
    {
        using var stream = Build(2, 2, 2, [], overrideStates: []);

        Assert.Throws<LitematicFormatException>(() => LitematicReader.Read(stream));
    }
}
