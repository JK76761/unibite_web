namespace UniBite.Api.Dtos;

public sealed record OverpassCampusImportResultDto(
    int CampusId,
    string CampusName,
    int RadiusMeters,
    bool DryRun,
    int DiscoveredCount,
    int InsertedCount,
    int UpdatedCount,
    int DuplicateCount,
    IReadOnlyList<OverpassImportedRestaurantDto> Restaurants);
