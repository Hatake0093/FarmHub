using FarmHub.Domain.Litematic;
using FarmHub.Infrastructure.Structures;
using fNbt;

namespace FarmHub.Tests;

public sealed class StructureReaderTests
{
    private static byte[] Varints(params int[] values)
    {
        var bytes = new List<byte>();
        foreach (var value in values)
        {
            var v = value;
            while (true)
            {
                var b = (byte)(v & 0x7F);
                v >>= 7;
                if (v == 0)
                {
                    bytes.Add(b);
                    break;
                }
                bytes.Add((byte)(b | 0x80));
            }
        }
        return bytes.ToArray();
    }

    private static MemoryStream Save(NbtCompound root)
    {
        var stream = new MemoryStream();
        new NbtFile(root).SaveToStream(stream, NbtCompression.GZip);
        stream.Position = 0;
        return stream;
    }

    private static NbtCompound Palette(params string[] names)
    {
        var palette = new NbtCompound("Palette");
        for (int i = 0; i < names.Length; i++)
        {
            palette.Add(new NbtInt(names[i], i));
        }
        return palette;
    }

    [Fact]
    public void Schematic_v2_is_read_with_varint_block_data()
    {
        // 2x1x2: (y*length + z)*width + x -> índices 0,1,1,2
        var root = new NbtCompound("")
        {
            new NbtShort("Version", 2),
            new NbtShort("Width", 2),
            new NbtShort("Height", 1),
            new NbtShort("Length", 2),
            Palette("minecraft:air", "minecraft:stone", "minecraft:hopper"),
            new NbtByteArray("BlockData", Varints(0, 1, 1, 2)),
        };

        var region = Assert.Single(SchematicReader.Read(Save(root)).Regions);

        Assert.Equal(2, region.Width);
        Assert.Equal(2, region.Depth);
        Assert.Equal(new[] { 0, 1, 1, 2 }, region.PaletteIndices);
        Assert.Equal("minecraft:hopper", region.Palette[region.IndexAt(1, 0, 1)]);
    }

    [Fact]
    public void Varints_above_one_byte_are_decoded()
    {
        // Paleta grande: el índice 200 ocupa dos bytes en varint.
        var names = Enumerable.Range(0, 201).Select(i => $"minecraft:b{i}").ToArray();
        var root = new NbtCompound("")
        {
            new NbtShort("Version", 2),
            new NbtShort("Width", 1),
            new NbtShort("Height", 1),
            new NbtShort("Length", 1),
            Palette(names),
            new NbtByteArray("BlockData", Varints(200)),
        };

        var region = Assert.Single(SchematicReader.Read(Save(root)).Regions);

        Assert.Equal(200, region.PaletteIndices[0]);
    }

    [Fact]
    public void Schematic_v3_is_read_from_blocks_wrapper()
    {
        var blocks = new NbtCompound("Blocks")
        {
            Palette("minecraft:air", "minecraft:stone"),
            new NbtByteArray("Data", Varints(1, 0)),
        };
        var root = new NbtCompound("")
        {
            new NbtCompound("Schematic")
            {
                new NbtInt("Version", 3),
                new NbtShort("Width", 2),
                new NbtShort("Height", 1),
                new NbtShort("Length", 1),
                blocks,
            },
        };

        var region = Assert.Single(SchematicReader.Read(Save(root)).Regions);

        Assert.Equal(new[] { 1, 0 }, region.PaletteIndices);
    }

    [Fact]
    public void Schematic_with_index_outside_palette_is_rejected()
    {
        var root = new NbtCompound("")
        {
            new NbtShort("Version", 2),
            new NbtShort("Width", 1),
            new NbtShort("Height", 1),
            new NbtShort("Length", 1),
            Palette("minecraft:air"),
            new NbtByteArray("BlockData", Varints(5)),
        };

        Assert.Throws<LitematicFormatException>(() => SchematicReader.Read(Save(root)));
    }

    [Fact]
    public void Structure_nbt_fills_missing_positions_with_air()
    {
        // Tamaño 2x1x2; solo hay bloque en (1,0,0) y (0,0,1). El resto es aire.
        var blocks = new NbtList("blocks", NbtTagType.Compound)
        {
            new NbtCompound { new NbtList("pos", NbtTagType.Int) { new NbtInt(1), new NbtInt(0), new NbtInt(0) }, new NbtInt("state", 0) },
            new NbtCompound { new NbtList("pos", NbtTagType.Int) { new NbtInt(0), new NbtInt(0), new NbtInt(1) }, new NbtInt("state", 1) },
        };
        var palette = new NbtList("palette", NbtTagType.Compound)
        {
            new NbtCompound { new NbtString("Name", "minecraft:stone") },
            new NbtCompound { new NbtString("Name", "minecraft:hopper") },
        };
        var root = new NbtCompound("")
        {
            new NbtList("size", NbtTagType.Int) { new NbtInt(2), new NbtInt(1), new NbtInt(2) },
            palette,
            blocks,
        };

        var region = Assert.Single(StructureNbtReader.Read(Save(root)).Regions);

        Assert.Equal("minecraft:air", region.Palette[region.PaletteIndices[0]]);
        Assert.Equal("minecraft:stone", region.Palette[region.IndexAt(1, 0, 0)]);
        Assert.Equal("minecraft:hopper", region.Palette[region.IndexAt(0, 0, 1)]);
        Assert.Equal("minecraft:air", region.Palette[region.IndexAt(0, 0, 0)]);
    }

    [Fact]
    public void Structure_block_outside_bounds_is_rejected()
    {
        var blocks = new NbtList("blocks", NbtTagType.Compound)
        {
            new NbtCompound { new NbtList("pos", NbtTagType.Int) { new NbtInt(5), new NbtInt(0), new NbtInt(0) }, new NbtInt("state", 0) },
        };
        var root = new NbtCompound("")
        {
            new NbtList("size", NbtTagType.Int) { new NbtInt(1), new NbtInt(1), new NbtInt(1) },
            new NbtList("palette", NbtTagType.Compound) { new NbtCompound { new NbtString("Name", "minecraft:stone") } },
            blocks,
        };

        Assert.Throws<LitematicFormatException>(() => StructureNbtReader.Read(Save(root)));
    }
}
