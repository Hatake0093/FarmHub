using FarmHub.Domain.Litematic;

namespace FarmHub.Tests;

public sealed class LitematicStatisticsTests
{
    [Fact]
    public void CountBlocks_excludes_air_and_groups_by_block_across_regions()
    {
        var first = new LitematicRegion("a", 0, 0, 0, 2, 1, 2,
            ["minecraft:air", "minecraft:stone", "minecraft:cave_air"],
            [0, 1, 1, 2]);
        var second = new LitematicRegion("b", 0, 0, 0, 1, 1, 2,
            ["minecraft:stone"],
            [0, 0]);
        var model = new LitematicModel("m", null, null, [first, second]);

        var counts = LitematicStatistics.CountBlocks(model);

        Assert.Equal(4, counts["minecraft:stone"]);
        Assert.Single(counts);
        Assert.DoesNotContain("minecraft:air", counts.Keys);
        Assert.DoesNotContain("minecraft:cave_air", counts.Keys);
    }
}
