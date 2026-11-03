using System.Security.Cryptography;
using FarmHub.Domain.Storage;

namespace FarmHub.Infrastructure.Storage;

/// <summary>
/// Guarda archivos en una carpeta local. La clave es un GUID generado por el servidor,
/// así que el nombre original del usuario nunca forma parte de una ruta del disco.
/// </summary>
public sealed class LocalFileStorage(string rootPath) : IFileStorage
{
    private readonly string _rootPath = Path.GetFullPath(rootPath);

    public async Task<StoredFile> SaveAsync(Stream content, CancellationToken cancellationToken = default)
    {
        Directory.CreateDirectory(_rootPath);

        var storageKey = Guid.NewGuid().ToString("N");
        var path = Path.Combine(_rootPath, storageKey);

        using var sha256 = SHA256.Create();
        long size = 0;

        await using (var target = new FileStream(path, FileMode.CreateNew, FileAccess.Write, FileShare.None, 81920, useAsync: true))
        await using (var hashing = new CryptoStream(target, sha256, CryptoStreamMode.Write))
        {
            var buffer = new byte[81920];
            int read;
            while ((read = await content.ReadAsync(buffer, cancellationToken)) > 0)
            {
                await hashing.WriteAsync(buffer.AsMemory(0, read), cancellationToken);
                size += read;
            }
            await hashing.FlushFinalBlockAsync(cancellationToken);
        }

        return new StoredFile(storageKey, size, Convert.ToHexString(sha256.Hash!).ToLowerInvariant());
    }

    public Stream OpenRead(string storageKey)
    {
        // Solo claves generadas por el servidor: evita recorridos de ruta ("..", separadores).
        if (!IsValidKey(storageKey))
        {
            throw new ArgumentException("Clave de almacenamiento no válida.", nameof(storageKey));
        }

        var path = Path.Combine(_rootPath, storageKey);
        return new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read, 81920, useAsync: true);
    }

    public void Delete(string storageKey)
    {
        if (!IsValidKey(storageKey))
        {
            throw new ArgumentException("Clave de almacenamiento no válida.", nameof(storageKey));
        }

        var path = Path.Combine(_rootPath, storageKey);
        if (File.Exists(path))
        {
            File.Delete(path);
        }
    }

    private static bool IsValidKey(string storageKey) =>
        storageKey.Length == 32 && storageKey.All(char.IsAsciiHexDigitLower);
}
