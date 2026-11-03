namespace FarmHub.Domain.Structures;

/// <summary>Cambio de un bloque. Block null o vacío significa aire.</summary>
public sealed record StructureBlockChange(int X, int Y, int Z, string? Block);
