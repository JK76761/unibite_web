namespace UniBite.Api.Dtos;

public sealed record OverpassImportedRestaurantDto(
    string Name,
    string Address,
    string Cuisine,
    double DistanceFromCampusKm,
    string Status);
