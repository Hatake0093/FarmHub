using FarmHub.Infrastructure.Catalog;

namespace FarmHub.Tests;

public sealed class BlockCatalogTests
{
    [Fact]
    public void Curated_list_has_namespaced_unique_ids()
    {
        var ids = BlockCatalog.LoadIds();

        Assert.True(ids.Count >= 200);
        Assert.All(ids, id => Assert.StartsWith("minecraft:", id));
        Assert.Equal(ids.Count, ids.Distinct().Count());
    }

    [Theory]
    [InlineData("minecraft:polished_andesite", "Polished Andesite")]
    [InlineData("minecraft:stone", "Stone")]
    public void English_name_is_derived_from_the_id(string id, string expected)
    {
        Assert.Equal(expected, BlockCatalog.EnglishName(id));
    }
}
