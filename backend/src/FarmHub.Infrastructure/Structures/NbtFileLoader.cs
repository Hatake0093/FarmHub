using FarmHub.Domain.Litematic;
using System.IO.Compression;
using FarmHub.Infrastructure.Litematic;
using fNbt;

namespace FarmHub.Infrastructure.Structures;

/// <summary>Carga comunes para los formatos NBT: descompresión con límite y lectura de enteros.</summary>
internal static class NbtFileLoader
{
    /// <summary>
    /// Lee el compuesto raíz de un NBT, comprimido con GZip o sin comprimir.
    /// La detección se hace por los bytes iniciales (0x1f 0x8b = GZip) y el tamaño descomprimido tiene límite.
    /// </summary>
    public static NbtCompound LoadRoot(Stream stream)
    {
        using var raw = new MemoryStream();
        var buffer = new byte[81920];
        int read;
        long total = 0;
        while ((read = stream.Read(buffer, 0, buffer.Length)) > 0)
        {
            total += read;
            if (total > LitematicLimits.MaxUncompressedBytes)
            {
                throw new LitematicFormatException("El archivo supera el tamaño máximo permitido.");
            }
            raw.Write(buffer, 0, read);
        }

        raw.Position = 0;
        var isGzip = raw.Length >= 2 && raw.ReadByte() == 0x1f && raw.ReadByte() == 0x8b;
        raw.Position = 0;

        using Stream source = isGzip ? new GZipStream(raw, CompressionMode.Decompress) : raw;
        using var limited = new LimitedReadStream(source, LitematicLimits.MaxUncompressedBytes);

        var file = new NbtFile();
        try
        {
            file.LoadFromStream(limited, NbtCompression.None);
        }
        catch (LitematicFormatException)
        {
            throw;
        }
        catch (Exception)
        {
            throw new LitematicFormatException("El archivo no es un NBT válido.");
        }

        return file.RootTag as NbtCompound
            ?? throw new LitematicFormatException("La raíz del NBT no es un compuesto.");
    }

    /// <summary>Lee un entero de cualquier tipo numérico NBT habitual.</summary>
    public static int ToInt(NbtTag? tag, string field) => tag switch
    {
        NbtInt i => i.Value,
        NbtShort s => s.Value,
        NbtByte b => b.Value,
        _ => throw new LitematicFormatException($"El campo '{field}' no es un entero válido."),
    };

    /// <summary>Valida que el volumen de la estructura esté dentro de los límites.</summary>
    public static void ValidateVolume(long width, long height, long depth)
    {
        if (width <= 0 || height <= 0 || depth <= 0)
        {
            throw new LitematicFormatException("Las dimensiones de la estructura deben ser mayores que 0.");
        }
        if (width * height * depth > LitematicLimits.MaxRegionVolume)
        {
            throw new LitematicFormatException("La estructura supera el volumen máximo permitido.");
        }
    }
}
