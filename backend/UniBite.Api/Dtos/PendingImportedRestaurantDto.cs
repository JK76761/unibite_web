namespace UniBite.Api.Dtos;

public sealed record PendingImportedRestaurantDto(
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
    string? ExternalSource,
    string? ExternalPlaceId,
    DateTime? LastSyncedAtUtc,
    string ReviewStatus,
    int ReviewScore,
    string RecommendedAction,
    IReadOnlyList<string> Flags,
    IReadOnlyList<string> ReviewNotes,
    PendingImportedDuplicateHintDto? DuplicateHint);
