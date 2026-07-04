namespace UniBite.Api.Dtos;

public sealed record NormalizeRestaurantDataResultDto(
    int? CampusId,
    string CampusName,
    int ScannedCount,
    int UpdatedCount,
    int NamesNormalizedCount,
    int ClassificationsUpdatedCount,
    int DescriptionsRefreshedCount,
    int WebsitesClearedCount);
