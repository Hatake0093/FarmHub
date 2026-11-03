using FarmHub.Domain.Rules;

namespace FarmHub.Tests;

public sealed class DependencyRulesTests
{
    private static IReadOnlyDictionary<int, IReadOnlyCollection<int>> Graph(params (int From, int To)[] edges) =>
        edges.GroupBy(e => e.From).ToDictionary(g => g.Key, g => (IReadOnlyCollection<int>)g.Select(e => e.To).ToList());

    [Fact]
    public void A_farm_cannot_require_itself()
    {
        Assert.True(DependencyRules.WouldCreateCycle(1, 1, Graph()));
    }

    [Fact]
    public void Direct_cycle_is_detected()
    {
        // 2 ya necesita 1; añadir "1 necesita 2" cerraría el ciclo.
        var graph = Graph((2, 1));
        Assert.True(DependencyRules.WouldCreateCycle(1, 2, graph));
    }

    [Fact]
    public void Indirect_cycle_is_detected()
    {
        // 3 -> 2 -> 1 ; añadir "1 necesita 3" cerraría el ciclo.
        var graph = Graph((3, 2), (2, 1));
        Assert.True(DependencyRules.WouldCreateCycle(1, 3, graph));
    }

    [Fact]
    public void Acyclic_dependency_is_allowed()
    {
        // 1 necesita 2 y 2 necesita 3: añadir "1 necesita 3" no crea ciclo.
        var graph = Graph((1, 2), (2, 3));
        Assert.False(DependencyRules.WouldCreateCycle(1, 3, graph));
    }

    [Fact]
    public void Graph_with_unrelated_cycle_does_not_block_new_edge()
    {
        var graph = Graph((5, 6), (6, 5));
        Assert.False(DependencyRules.WouldCreateCycle(1, 2, graph));
    }
}
