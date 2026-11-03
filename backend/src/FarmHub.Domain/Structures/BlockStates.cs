using System.Text.RegularExpressions;

namespace FarmHub.Domain.Structures;

/// <summary>
/// Texto de un bloque con estado: "minecraft:oak_stairs[facing=east,half=bottom]". Las propiedades
/// se ordenan para que el mismo bloque tenga siempre el mismo texto en la paleta.
/// </summary>
public static class BlockStates
{
    private static readonly Regex Pattern = new(
        @"^[a-z0-9_.-]+:[a-z0-9/_.-]+(\[[a-z_]+=[a-z0-9_]+(,[a-z_]+=[a-z0-9_]+)*\])?$",
        RegexOptions.Compiled);

    public static bool IsValid(string block) => Pattern.IsMatch(block.Trim());

    public static string Normalize(string block)
    {
        var trimmed = block.Trim();
        var start = trimmed.IndexOf('[');
        if (start < 0)
        {
            return trimmed;
        }

        var id = trimmed[..start];
        var props = trimmed[(start + 1)..^1].Split(',').OrderBy(p => p, StringComparer.Ordinal);
        return $"{id}[{string.Join(',', props)}]";
    }
}
