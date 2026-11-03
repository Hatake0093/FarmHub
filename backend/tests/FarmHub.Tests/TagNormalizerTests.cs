using FarmHub.Domain.Rules;

namespace FarmHub.Tests;

public sealed class TagNormalizerTests
{
    [Theory]
    [InlineData(" Mobs ", "mobs")]
    [InlineData("MOBS", "mobs")]
    [InlineData("xp-farm", "xp-farm")]
    public void Normalize_trims_and_lowercases(string input, string expected)
    {
        Assert.Equal(expected, TagNormalizer.Normalize(input));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Normalize_rejects_empty_values(string? input)
    {
        Assert.Null(TagNormalizer.Normalize(input));
    }

    [Fact]
    public void Normalize_rejects_tags_longer_than_the_limit()
    {
        Assert.Null(TagNormalizer.Normalize(new string('a', TagNormalizer.MaxLength + 1)));
    }
}
