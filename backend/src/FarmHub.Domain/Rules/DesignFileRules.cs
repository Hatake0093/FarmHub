using FarmHub.Domain.Enums;

namespace FarmHub.Domain.Rules;

/// <summary>Reglas de admisión de archivos asociados a un diseño.</summary>
public static class DesignFileRules
{
    /// <summary>Tamaño máximo de un archivo subido (25 MB).</summary>
    public const long MaxFileSizeBytes = 25L * 1024 * 1024;

    /// <summary>Determina el tipo de archivo a partir de su extensión. Sin distinguir mayúsculas.</summary>
    public static bool TryGetKind(string fileName, out DesignFileKind kind)
    {
        var extension = Path.GetExtension(fileName).ToLowerInvariant();

        switch (extension)
        {
            case ".litematic":
                kind = DesignFileKind.Litematic;
                return true;
            case ".png":
            case ".jpg":
            case ".jpeg":
            case ".webp":
                kind = DesignFileKind.Image;
                return true;
            case ".pdf":
                kind = DesignFileKind.Pdf;
                return true;
            case ".schem":
                kind = DesignFileKind.Schematic;
                return true;
            case ".nbt":
                kind = DesignFileKind.Structure;
                return true;
            default:
                kind = default;
                return false;
        }
    }
}
