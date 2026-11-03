namespace FarmHub.Domain.Rules;

/// <summary>Reglas de dependencias entre granjas: sin autodependencias ni ciclos.</summary>
public static class DependencyRules
{
    /// <summary>
    /// Indica si añadir "farmId necesita requiredFarmId" crearía un ciclo.
    /// <paramref name="requiresByFarm"/> asocia cada granja con las granjas que necesita.
    /// </summary>
    public static bool WouldCreateCycle(
        int farmId,
        int requiredFarmId,
        IReadOnlyDictionary<int, IReadOnlyCollection<int>> requiresByFarm)
    {
        if (farmId == requiredFarmId)
        {
            return true;
        }

        // Hay ciclo si requiredFarmId ya depende (directa o indirectamente) de farmId.
        var pending = new Stack<int>();
        var visited = new HashSet<int>();
        pending.Push(requiredFarmId);

        while (pending.Count > 0)
        {
            var current = pending.Pop();
            if (current == farmId)
            {
                return true;
            }
            if (!visited.Add(current))
            {
                continue;
            }
            if (requiresByFarm.TryGetValue(current, out var next))
            {
                foreach (var id in next)
                {
                    pending.Push(id);
                }
            }
        }

        return false;
    }
}
