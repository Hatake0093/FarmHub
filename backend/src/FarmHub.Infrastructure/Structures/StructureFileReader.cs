using FarmHub.Domain.Enums;
using FarmHub.Domain.Litematic;
using FarmHub.Infrastructure.Litematic;

namespace FarmHub.Infrastructure.Structures;

/// <summary>Punto de entrada único: interpreta un archivo según su tipo.</summary>
public static class StructureFileReader
{
    public static bool IsStructureKind(DesignFileKind kind) =>
        kind is DesignFileKind.Litematic or DesignFileKind.Schematic or DesignFileKind.Structure;

    public static LitematicModel Read(DesignFileKind kind, Stream stream) => kind switch
    {
        DesignFileKind.Litematic => LitematicReader.Read(stream),
        DesignFileKind.Schematic => SchematicReader.Read(stream),
        DesignFileKind.Structure => StructureNbtReader.Read(stream),
        _ => throw new LitematicFormatException("Este tipo de archivo no es una estructura."),
    };
}
