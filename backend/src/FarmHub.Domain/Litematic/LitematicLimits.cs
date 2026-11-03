namespace FarmHub.Domain.Litematic;

/// <summary>Límites de seguridad para archivos Litematica importados.</summary>
public static class LitematicLimits
{
    /// <summary>Número máximo de bloques por región, para evitar memoria desbordada.</summary>
    public const long MaxRegionVolume = 8_000_000;

    /// <summary>Tamaño máximo descomprimido del NBT. Protege contra archivos comprimidos maliciosos.</summary>
    public const long MaxUncompressedBytes = 256L * 1024 * 1024;

    public const int MaxRegions = 64;
}
