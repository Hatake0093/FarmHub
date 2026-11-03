namespace FarmHub.Domain.Entities;

/// <summary>Cara de un bloque que puede llevar textura propia.</summary>
public enum TextureFace
{
    Side,
    Top,
    Bottom,
}

/// <summary>Acceso a las texturas por cara de un bloque. La de lados es la clave original TextureKey.</summary>
public static class BlockNameTextures
{
    public static string? KeyOf(BlockName block, TextureFace face) => face switch
    {
        TextureFace.Top => block.TextureKeyTop,
        TextureFace.Bottom => block.TextureKeyBottom,
        _ => block.TextureKey,
    };

    public static void SetKey(BlockName block, TextureFace face, string? key)
    {
        switch (face)
        {
            case TextureFace.Top: block.TextureKeyTop = key; break;
            case TextureFace.Bottom: block.TextureKeyBottom = key; break;
            default: block.TextureKey = key; break;
        }
    }

    /// <summary>Caras con textura, en minúsculas y en orden lados, arriba, abajo.</summary>
    public static IReadOnlyList<string> Faces(BlockName block) =>
        Enum.GetValues<TextureFace>()
            .Where(f => KeyOf(block, f) is not null)
            .Select(Name)
            .ToList();

    /// <summary>Nombre de la cara en la URL: "side", "top" o "bottom".</summary>
    public static string Name(TextureFace face) => face.ToString().ToLowerInvariant();

    public static bool TryParse(string? text, out TextureFace face) =>
        Enum.TryParse(text, ignoreCase: true, out face) && Enum.IsDefined(face);
}
