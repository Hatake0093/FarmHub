using System.Security.Cryptography;
using System.Text;
using FarmHub.Infrastructure.Storage;

namespace FarmHub.Tests;

public sealed class LocalFileStorageTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "farmhub-tests-" + Guid.NewGuid().ToString("N"));

    public void Dispose()
    {
        if (Directory.Exists(_root))
        {
            Directory.Delete(_root, recursive: true);
        }
    }

    [Fact]
    public async Task Save_then_read_returns_same_bytes_and_hash()
    {
        var storage = new LocalFileStorage(_root);
        var bytes = Encoding.UTF8.GetBytes("contenido de prueba");

        var stored = await storage.SaveAsync(new MemoryStream(bytes));

        Assert.Equal(bytes.Length, stored.SizeBytes);
        Assert.Equal(Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant(), stored.Sha256);

        await using var read = storage.OpenRead(stored.StorageKey);
        using var copy = new MemoryStream();
        await read.CopyToAsync(copy);
        Assert.Equal(bytes, copy.ToArray());
    }

    [Theory]
    [InlineData("../secret")]
    [InlineData("..\\secret")]
    [InlineData("C:\\windows\\system32\\config")]
    [InlineData("abc")]
    public void OpenRead_rejects_keys_that_are_not_server_generated(string key)
    {
        var storage = new LocalFileStorage(_root);

        Assert.Throws<ArgumentException>(() => storage.OpenRead(key));
    }
}
