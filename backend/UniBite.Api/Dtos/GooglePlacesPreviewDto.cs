namespace UniBite.Api.Dtos;

public sealed record GooglePlacesPreviewDto(
    int RestaurantId,
    bool IsConfigured,
    bool Matched,
    string Message,
    string? PlaceId,
    string? MatchedName,
    string? FormattedAddress,
    string? WebsiteUrl,
    string? GoogleMapsUri,
    string? PhotoUrl,
    string? PhotoAttribution,
    double? DistanceMeters);
