namespace UniBite.Api.Dtos;

public sealed record RestaurantDetailDto(
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
    bool IsApproved,
    DateTime CreatedAtUtc,
    double? AverageRating,
    int RatingCount,
    CampusDto Campus,
    IReadOnlyList<RatingDto> Ratings);
