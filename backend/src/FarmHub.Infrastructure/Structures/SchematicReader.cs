using FarmHub.Domain.Litematic;
using fNbt;

namespace FarmHub.Infrastructure.Structures;

/// <summary>
/// Lee archivos .schem (formato Sponge, versiones 2 y 3). Índice local: (y * length + z) * width + x.
/// Los datos de bloque se codifican como varints, un valor por posición.
/// </summary>
public static class SchematicReader
{
    public static LitematicModel Read(Stream stream)
    {
        var root = NbtFileLoader.LoadRoot(stream);

        // Versión 3 envuelve todo en "Schematic" y separa los bloques en "Blocks".
        var v3 = root.Get<NbtCompound>("Schematic");
        var sch = v3 ?? root;
        var blocks = v3 is null ? sch : sch.Get<NbtCompound>("Blocks") ?? throw new LitematicFormatException("Falta 'Blocks'.");

        var width = NbtFileLoader.ToInt(sch.Get("Width"), "Width");
        var height = NbtFileLoader.ToInt(sch.Get("Height"), "Height");
        var length = NbtFileLoader.ToInt(sch.Get("Length"), "Length");
        NbtFileLoader.ValidateVolume(width, height, length);

        var paletteTag = blocks.Get<NbtCompound>("Palette")
            ?? throw new LitematicFormatException("Falta la paleta del .schem.");
        var palette = new string[paletteTag.Count];
        foreach (var entry in paletteTag)
        {
            var id = NbtFileLoader.ToInt(entry, entry.Name);
            if (id < 0 || id >= palette.Length)
            {
                throw new LitematicFormatException("La paleta del .schem tiene identificadores fuera de rango.");
            }
            palette[id] = entry.Name ?? "minecraft:air";
        }

        // v2 guarda BlockData en la raíz; v3, en Blocks.Data.
        var data = (v3 is null ? sch.Get<NbtByteArray>("BlockData") : blocks.Get<NbtByteArray>("Data"))?.Value
            ?? throw new LitematicFormatException("Faltan los datos de bloques del .schem.");

        var count = width * height * length;
        var indices = DecodeVarints(data, count, palette.Length);

        return new LitematicModel(
            Name: "",
            Author: null,
            Description: null,
            Regions: [new LitematicRegion("schematic", 0, 0, 0, width, height, length, palette, indices)]);
    }

    private static int[] DecodeVarints(byte[] data, int count, int paletteSize)
    {
        var result = new int[count];
        var pos = 0;
        for (int i = 0; i < count; i++)
        {
            var value = 0;
            var shift = 0;
            while (true)
            {
                if (pos >= data.Length)
                {
                    throw new LitematicFormatException("Los datos de bloques del .schem son demasiado cortos.");
                }
                var b = data[pos++];
                value |= (b & 0x7F) << shift;
                if ((b & 0x80) == 0)
                {
                    break;
                }
                shift += 7;
                if (shift > 28)
                {
                    throw new LitematicFormatException("Dato varint no válido en el .schem.");
                }
            }

            if (value >= paletteSize)
            {
                throw new LitematicFormatException("Índice de paleta fuera de rango en el .schem.");
            }
            result[i] = value;
        }
        return result;
    }
}
