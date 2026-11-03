using FarmHub.Domain.Structures;

namespace FarmHub.Tests;

public sealed class BlockStatesTests
{
    [Theory]
    [InlineData("minecraft:stone")]
    [InlineData("minecraft:oak_stairs[facing=east,half=bottom]")]
    [InlineData("minecraft:ladder[facing=north]")]
    public void Valid_block_texts_are_accepted(string block) => Assert.True(BlockStates.IsValid(block));

    [Theory]
    [InlineData("minecraft:ladder[facing]")]
    [InlineData("minecraft:ladder[facing=north")]
    [InlineData("ladder facing=north")]
    [InlineData("minecraft:stone[]")]
    public void Malformed_block_texts_are_rejected(string block) => Assert.False(BlockStates.IsValid(block));

    [Fact]
    public void Properties_are_sorted_so_the_same_block_has_one_text()
    {
        Assert.Equal(
            "minecraft:oak_stairs[facing=east,half=bottom,shape=straight]",
            BlockStates.Normalize("minecraft:oak_stairs[shape=straight,half=bottom,facing=east]"));
    }
}
