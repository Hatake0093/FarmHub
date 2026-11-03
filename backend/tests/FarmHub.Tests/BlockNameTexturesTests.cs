using FarmHub.Domain.Entities;

namespace FarmHub.Tests;

public sealed class BlockNameTexturesTests
{
    [Fact]
    public void Each_face_stores_its_own_key()
    {
        var block = new BlockName { Id = "minecraft:grass_block" };

        BlockNameTextures.SetKey(block, TextureFace.Side, "side-key");
        BlockNameTextures.SetKey(block, TextureFace.Top, "top-key");

        Assert.Equal("side-key", block.TextureKey);
        Assert.Equal("top-key", block.TextureKeyTop);
        Assert.Null(block.TextureKeyBottom);
        Assert.Equal(["side", "top"], BlockNameTextures.Faces(block));
    }

    [Fact]
    public void Removing_a_key_drops_its_face()
    {
        var block = new BlockName { Id = "minecraft:stone", TextureKey = "side-key" };

        BlockNameTextures.SetKey(block, TextureFace.Side, null);

        Assert.Empty(BlockNameTextures.Faces(block));
    }

    [Theory]
    [InlineData("side", TextureFace.Side)]
    [InlineData("TOP", TextureFace.Top)]
    [InlineData("bottom", TextureFace.Bottom)]
    public void Face_names_parse_regardless_of_case(string text, TextureFace expected)
    {
        Assert.True(BlockNameTextures.TryParse(text, out var face));
        Assert.Equal(expected, face);
    }

    [Theory]
    [InlineData("front")]
    [InlineData("")]
    [InlineData(null)]
    public void Unknown_face_names_are_rejected(string? text)
    {
        Assert.False(BlockNameTextures.TryParse(text, out _));
    }
}
