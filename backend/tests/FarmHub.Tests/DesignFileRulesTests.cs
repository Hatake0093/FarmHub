using FarmHub.Domain.Enums;
using FarmHub.Domain.Rules;

namespace FarmHub.Tests;

public sealed class DesignFileRulesTests
{
    [Theory]
    [InlineData("farm.litematic", DesignFileKind.Litematic)]
    [InlineData("FARM.LITEMATIC", DesignFileKind.Litematic)]
    [InlineData("preview.png", DesignFileKind.Image)]
    [InlineData("preview.JPEG", DesignFileKind.Image)]
    [InlineData("guide.pdf", DesignFileKind.Pdf)]
    [InlineData("farm.schem", DesignFileKind.Schematic)]
    [InlineData("screw.NBT", DesignFileKind.Structure)]
    public void Accepted_extensions_map_to_kind(string fileName, DesignFileKind expected)
    {
        Assert.True(DesignFileRules.TryGetKind(fileName, out var kind));
        Assert.Equal(expected, kind);
    }

    [Theory]
    [InlineData("script.exe")]
    [InlineData("noextension")]
    public void Unknown_extensions_are_rejected(string fileName)
    {
        Assert.False(DesignFileRules.TryGetKind(fileName, out _));
    }
}
