namespace UniBite.Api.Dtos;

public sealed class RestaurantQueryParameters
{
    public int? CampusId { get; init; }

    public string? Cuisine { get; init; }

    public string? Budget { get; init; }

    public string? Mood { get; init; }

    public double? MaxDistanceKm { get; init; }

    public string? Search { get; init; }
}
