namespace FarmHub.Domain.Storage;

/// <summary>Almacén de archivos de diseños. La base de datos solo guarda la clave devuelta.</summary>
public interface IFileStorage
{
    Task<StoredFile> SaveAsync(Stream content, CancellationToken cancellationToken = default);

    Stream OpenRead(string storageKey);

    /// <summary>Borra el archivo si existe. No falla si ya no está.</summary>
    void Delete(string storageKey);
}

public sealed record StoredFile(string StorageKey, long SizeBytes, string Sha256);
