using FarmHub.Domain.Structures;

namespace FarmHub.Tests;

public sealed class StructureGridTests
{
    [Fact]
    public void New_grid_is_all_air()
    {
        var grid = new StructureGrid(2, 2, 2);

        Assert.Equal(StructureGrid.Air, grid.BlockAt(1, 1, 1));
        Assert.Equal(new[] { StructureGrid.Air }, grid.Palette);
    }

    [Fact]
    public void Set_adds_block_to_palette_and_reads_back()
    {
        var grid = new StructureGrid(3, 2, 2);

        grid.Set(2, 1, 0, "minecraft:hopper");

        Assert.Equal("minecraft:hopper", grid.BlockAt(2, 1, 0));
        Assert.Equal(StructureGrid.Air, grid.BlockAt(0, 0, 0));
    }

    [Fact]
    public void Index_follows_the_shared_layout()
    {
        var grid = new StructureGrid(3, 2, 2);

        // (y*depth + z)*width + x = (1*2 + 1)*3 + 2 = 11
        Assert.Equal(11, grid.IndexOf(2, 1, 1));
    }

    [Fact]
    public void Setting_air_or_null_clears_the_cell()
    {
        var grid = new StructureGrid(1, 1, 1);
        grid.Set(0, 0, 0, "minecraft:stone");

        grid.Set(0, 0, 0, null);

        Assert.Equal(StructureGrid.Air, grid.BlockAt(0, 0, 0));
    }

    [Fact]
    public void Out_of_range_positions_are_rejected()
    {
        var grid = new StructureGrid(2, 2, 2);

        Assert.Throws<ArgumentOutOfRangeException>(() => grid.Set(2, 0, 0, "minecraft:stone"));
        Assert.Throws<ArgumentOutOfRangeException>(() => grid.Set(0, -1, 0, "minecraft:stone"));
    }

    [Fact]
    public void Palette_cannot_exceed_256_blocks()
    {
        // 200x2x1 tiene 400 posiciones: basta para 255 bloques distintos además del aire.
        var grid = new StructureGrid(200, 2, 1);
        for (int i = 1; i < 256; i++)
        {
            grid.Set(i % 200, i / 200, 0, $"minecraft:b{i}");
        }

        Assert.Throws<InvalidOperationException>(() => grid.Set(0, 0, 0, "minecraft:overflow"));
    }

    [Fact]
    public void Volume_and_dimension_limits_are_enforced()
    {
        Assert.Throws<ArgumentException>(() => new StructureGrid(0, 1, 1));
        Assert.Throws<ArgumentException>(() => new StructureGrid(201, 1, 1));
        Assert.Throws<ArgumentException>(() => new StructureGrid(200, 200, 200));
    }
}
