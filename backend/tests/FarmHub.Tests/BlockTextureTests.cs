using FarmHub.Api.Controllers;

namespace FarmHub.Tests;

public sealed class BlockTextureTests
{
    [Fact]
    public void Accepts_png_within_256_pixels()
    {
        // Cabecera PNG: firma + IHDR con ancho 16 y alto 16.
        byte[] header = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0x0D, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 16, 0, 0, 0, 16];

        Assert.True(BlocksController.IsSupportedImage(header, header.Length, out _));
    }

    [Fact]
    public void Rejects_png_larger_than_256_pixels()
    {
        byte[] header = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0x0D, 0x49, 0x48, 0x44, 0x52, 0, 0, 0x02, 0x00, 0, 0, 0, 16];

        Assert.False(BlocksController.IsSupportedImage(header, header.Length, out var problem));
        Assert.Contains("256", problem);
    }

    [Fact]
    public void Rejects_unknown_formats()
    {
        byte[] header = "GIF89a..........."u8.ToArray();

        Assert.False(BlocksController.IsSupportedImage(header, header.Length, out _));
    }

    [Fact]
    public void Accepts_jpeg_and_webp_signatures()
    {
        byte[] jpeg = [0xFF, 0xD8, 0xFF, 0xE0, 0, 0, 0, 0];
        byte[] webp = "RIFF\0\0\0\0WEBPVP8 "u8.ToArray();

        Assert.True(BlocksController.IsSupportedImage(jpeg, jpeg.Length, out _));
        Assert.True(BlocksController.IsSupportedImage(webp, webp.Length, out _));
    }
}
