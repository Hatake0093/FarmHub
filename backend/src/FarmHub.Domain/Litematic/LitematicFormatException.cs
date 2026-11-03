namespace FarmHub.Domain.Litematic;

/// <summary>El archivo no es un Litematica válido o supera los límites permitidos.</summary>
public sealed class LitematicFormatException(string message) : Exception(message);
