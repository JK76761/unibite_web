namespace UniBite.Api.Dtos;

public sealed record CampusDto(
    int Id,
    string Name,
    string University,
    string Suburb,
    double Latitude,
    double Longitude,
    int ApprovedRestaurantCount);
