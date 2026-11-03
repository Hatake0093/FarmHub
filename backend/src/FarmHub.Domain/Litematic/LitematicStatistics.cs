namespace FarmHub.Domain.Litematic;

/// <summary>Cálculos sobre un modelo Litematica: recuento de bloques por tipo.</summary>
public static class LitematicStatistics
{
    /// <summary>Bloques que no son material de construcción.</summary>
    public static readonly IReadOnlySet<string> AirBlocks = new HashSet<string>
    {
        "minecraft:air",
        "minecraft:cave_air",
        "minecraft:void_air",
    };

    /// <summary>Nombre sin propiedades: "minecraft:oak_slab[type=top]" -> "minecraft:oak_slab".</summary>
    public static string BaseName(string blockState)
    {
        var bracket = blockState.IndexOf('[');
        return bracket < 0 ? blockState : blockState[..bracket];
    }

    /// <summary>Cuenta los bloques de todas las regiones, sin aire, agrupados por nombre.</summary>
    public static IReadOnlyDictionary<string, long> CountBlocks(LitematicModel model)
    {
        var counts = new Dictionary<string, long>();

        foreach (var region in model.Regions)
        {
            // Primero se cuentan índices de paleta (rápido) y luego se traducen a nombres.
            var perPalette = new long[region.Palette.Count];
            foreach (var index in region.PaletteIndices)
            {
                perPalette[index]++;
            }

            for (int i = 0; i < perPalette.Length; i++)
            {
                // Las variantes (losa de arriba y de abajo) cuentan como el mismo material.
                var name = BaseName(region.Palette[i]);
                if (perPalette[i] == 0 || AirBlocks.Contains(name))
                {
                    continue;
                }
                counts[name] = counts.GetValueOrDefault(name) + perPalette[i];
            }
        }

        return counts.OrderByDescending(kv => kv.Value).ToDictionary(kv => kv.Key, kv => kv.Value);
    }
}
