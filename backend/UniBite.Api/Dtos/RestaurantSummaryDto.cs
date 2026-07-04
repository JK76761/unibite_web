namespace UniBite.Api.Dtos;

public sealed record RestaurantSummaryDto(
    int Id,
    string Name,
    string Address,
    string Cuisine,
    string Budget,
    string Mood,
    string Description,
    string? WebsiteUrl,
    string? PhotoUrl,
    double DistanceFromCampusKm,
    double Latitude,
    double Longitude,
    double? AverageRating,
    int RatingCount,
    CampusDto Campus);
