namespace FarmHub.Domain.Rules;

/// <summary>Normaliza etiquetas libres para que "Mobs", " mobs " y "MOBS" sean la misma.</summary>
public static class TagNormalizer
{
    public const int MaxLength = 50;

    /// <summary>Devuelve la etiqueta normalizada o null si no es válida.</summary>
    public static string? Normalize(string? tag)
    {
        var normalized = tag?.Trim().ToLowerInvariant();

        return string.IsNullOrEmpty(normalized) || normalized.Length > MaxLength ? null : normalized;
    }
}
