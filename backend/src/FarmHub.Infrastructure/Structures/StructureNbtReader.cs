using FarmHub.Domain.Litematic;
using fNbt;

namespace FarmHub.Infrastructure.Structures;

/// <summary>
/// Lee estructuras .nbt de Minecraft (bloque de estructura). Solo las posiciones listadas en "blocks"
/// tienen bloque; el resto es aire. Índice local: (y * depth + z) * width + x.
/// </summary>
public static class StructureNbtReader
{
    private const string Air = "minecraft:air";

    public static LitematicModel Read(Stream stream)
    {
        var root = NbtFileLoader.LoadRoot(stream);

        var size = root.Get<NbtList>("size")
            ?? throw new LitematicFormatException("Falta 'size' en la estructura.");
        if (size.Count != 3)
        {
            throw new LitematicFormatException("'size' debe tener tres valores.");
        }
        var width = NbtFileLoader.ToInt(size[0], "size");
        var height = NbtFileLoader.ToInt(size[1], "size");
        var depth = NbtFileLoader.ToInt(size[2], "size");
        NbtFileLoader.ValidateVolume(width, height, depth);

        var paletteTag = root.Get<NbtList>("palette")
            ?? throw new LitematicFormatException("Falta la paleta de la estructura.");
        var palette = paletteTag
            .Select(entry => entry is NbtCompound c ? c.Get<NbtString>("Name")?.Value ?? Air : Air)
            .ToList();

        var blocks = root.Get<NbtList>("blocks")
            ?? throw new LitematicFormatException("Faltan los bloques de la estructura.");

        var volume = width * height * depth;
        var airIndex = palette.IndexOf(Air);
        if (airIndex < 0 && blocks.Count < volume)
        {
            // Las celdas sin bloque son aire: hace falta una entrada de aire en la paleta.
            airIndex = palette.Count;
            palette.Add(Air);
        }

        var indices = new int[volume];
        if (airIndex > 0)
        {
            Array.Fill(indices, airIndex);
        }

        foreach (var entry in blocks)
        {
            if (entry is not NbtCompound block)
            {
                throw new LitematicFormatException("Bloque no válido en la estructura.");
            }

            var pos = block.Get<NbtList>("pos")
                ?? throw new LitematicFormatException("Bloque sin posición.");
            var x = NbtFileLoader.ToInt(pos[0], "pos");
            var y = NbtFileLoader.ToInt(pos[1], "pos");
            var z = NbtFileLoader.ToInt(pos[2], "pos");
            if (x < 0 || y < 0 || z < 0 || x >= width || y >= height || z >= depth)
            {
                throw new LitematicFormatException("Un bloque está fuera de los límites de la estructura.");
            }

            var state = NbtFileLoader.ToInt(block.Get("state"), "state");
            if (state < 0 || state >= palette.Count)
            {
                throw new LitematicFormatException("Índice de paleta fuera de rango en la estructura.");
            }

            indices[(y * depth + z) * width + x] = state;
        }

        return new LitematicModel(
            Name: "",
            Author: null,
            Description: null,
            Regions: [new LitematicRegion("structure", 0, 0, 0, width, height, depth, palette, indices)]);
    }
}
