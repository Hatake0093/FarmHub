using FarmHub.Domain.Entities;

namespace FarmHub.Api.Contracts;

public static class FarmLinkMapping
{
    public static FarmLinkResponse From(FarmLink link) =>
        new(link.Id, link.Title, link.Url, link.Kind.ToString());
}

public static class FarmProductionMapping
{
    public static FarmProductionResponse From(FarmProduction production) => new(
        production.Id,
        production.ResourceName,
        production.AmountPerHour,
        production.Unit.ToString(),
        production.RequiresAfk,
        production.MeasurementConditions,
        production.Source,
        production.MeasuredInVersionId,
        production.MeasuredInVersion?.Name);
}
