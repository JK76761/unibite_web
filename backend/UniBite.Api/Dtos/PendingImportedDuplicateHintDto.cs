namespace UniBite.Api.Dtos;

public sealed record PendingImportedDuplicateHintDto(
    int RestaurantId,
    string Name,
    bool IsApproved,
    double DistanceKm,
    string MatchReason);
