using FarmHub.Domain.Litematic;
using fNbt;

namespace FarmHub.Infrastructure.Litematic;

/// <summary>
/// Lee archivos .litematic (NBT comprimido con GZip) y los convierte a <see cref="LitematicModel"/>.
///
/// Supuestos del formato que deben validarse con archivos reales de Litematica:
///  - Índice de bloque local: (y * depth + z) * width + x.
///  - Empaquetado: cada entrada ocupa bits = max(2, ceil(log2(tamaño de paleta))) bits y no cruza
///    los límites de un long (formato a partir de Minecraft 1.16).
/// </summary>
public static class LitematicReader
{
    public static LitematicModel Read(Stream stream)
    {
        using var limited = new LimitedReadStream(stream, LitematicLimits.MaxUncompressedBytes);

        var file = new NbtFile();
        try
        {
            file.LoadFromStream(limited, NbtCompression.GZip);
        }
        catch (Exception ex) when (ex is not LitematicFormatException)
        {
            throw new LitematicFormatException("El archivo no es un NBT comprimido válido.");
        }

        if (file.RootTag is not NbtCompound root)
        {
            throw new LitematicFormatException("La raíz del NBT no es un compuesto.");
        }

        var metadata = root.Get<NbtCompound>("Metadata");
        var regionsTag = root.Get<NbtCompound>("Regions")
            ?? throw new LitematicFormatException("Falta el bloque 'Regions'.");

        if (regionsTag.Count == 0)
        {
            throw new LitematicFormatException("El archivo no contiene regiones.");
        }
        if (regionsTag.Count > LitematicLimits.MaxRegions)
        {
            throw new LitematicFormatException($"El archivo supera el máximo de {LitematicLimits.MaxRegions} regiones.");
        }

        var regions = regionsTag.Select(ReadRegion).ToList();

        return new LitematicModel(
            Name: metadata?.Get<NbtString>("Name")?.Value ?? "",
            Author: metadata?.Get<NbtString>("Author")?.Value is { Length: > 0 } author ? author : null,
            Description: metadata?.Get<NbtString>("Description")?.Value is { Length: > 0 } description ? description : null,
            Regions: regions);
    }

    private static LitematicRegion ReadRegion(NbtTag tag)
    {
        if (tag is not NbtCompound region)
        {
            throw new LitematicFormatException("Región no válida.");
        }

        var position = ReadVector(region, "Position");
        var size = ReadVector(region, "Size");

        long volume = (long)Math.Abs(size.x) * Math.Abs(size.y) * Math.Abs(size.z);
        if (size.x == 0 || size.y == 0 || size.z == 0)
        {
            throw new LitematicFormatException($"La región '{tag.Name}' tiene un tamaño de 0.");
        }
        if (volume > LitematicLimits.MaxRegionVolume)
        {
            throw new LitematicFormatException($"La región '{tag.Name}' supera el volumen máximo permitido.");
        }

        var paletteTag = region.Get<NbtList>("BlockStatePalette")
            ?? throw new LitematicFormatException($"La región '{tag.Name}' no tiene paleta.");
        var palette = paletteTag.Select(entry =>
            entry is NbtCompound c ? c.Get<NbtString>("Name")?.Value ?? "minecraft:air" : "minecraft:air").ToList();
        if (palette.Count == 0)
        {
            throw new LitematicFormatException($"La región '{tag.Name}' tiene una paleta vacía.");
        }

        var states = region.Get<NbtLongArray>("BlockStates")
            ?? throw new LitematicFormatException($"La región '{tag.Name}' no tiene BlockStates.");

        var indices = Unpack(states.Value, (int)volume, palette.Count, tag.Name);

        return new LitematicRegion(
            tag.Name,
            position.x, position.y, position.z,
            size.x, size.y, size.z,
            palette,
            indices);
    }

    private static (int x, int y, int z) ReadVector(NbtCompound parent, string name)
    {
        var v = parent.Get<NbtCompound>(name)
            ?? throw new LitematicFormatException($"Falta el vector '{name}'.");
        return (
            v.Get<NbtInt>("x")?.Value ?? throw new LitematicFormatException($"'{name}' sin x."),
            v.Get<NbtInt>("y")?.Value ?? throw new LitematicFormatException($"'{name}' sin y."),
            v.Get<NbtInt>("z")?.Value ?? throw new LitematicFormatException($"'{name}' sin z."));
    }

    private static int[] Unpack(long[] data, int count, int paletteSize, string regionName)
    {
        int bits = Math.Max(2, (int)Math.Ceiling(Math.Log2(paletteSize)));
        int perLong = 64 / bits;
        long mask = (1L << bits) - 1;

        long needed = (count + perLong - 1) / perLong;
        if (data.Length < needed)
        {
            throw new LitematicFormatException($"Los BlockStates de '{regionName}' son demasiado cortos.");
        }

        var result = new int[count];
        for (int i = 0; i < count; i++)
        {
            long word = data[i / perLong];
            int shift = (i % perLong) * bits;
            int index = (int)((word >> shift) & mask);
            if (index >= paletteSize)
            {
                throw new LitematicFormatException($"Índice de paleta fuera de rango en '{regionName}'.");
            }
            result[i] = index;
        }
        return result;
    }
}

/// <summary>Lee como máximo <c>limit</c> bytes del flujo descomprimido.</summary>
internal sealed class LimitedReadStream(Stream inner, long limit) : Stream
{
    private long _read;

    public override bool CanRead => true;
    public override bool CanSeek => false;
    public override bool CanWrite => false;
    public override long Length => throw new NotSupportedException();
    public override long Position { get => _read; set => throw new NotSupportedException(); }
    public override void Flush() { }
    public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();
    public override void SetLength(long value) => throw new NotSupportedException();
    public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();

    public override int Read(byte[] buffer, int offset, int count)
    {
        int n = inner.Read(buffer, offset, count);
        Track(n);
        return n;
    }

    private void Track(int n)
    {
        _read += n;
        if (_read > limit)
        {
            throw new LitematicFormatException("El archivo descomprimido supera el tamaño máximo permitido.");
        }
    }
}
