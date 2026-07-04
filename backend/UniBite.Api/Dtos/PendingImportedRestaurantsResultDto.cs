namespace UniBite.Api.Dtos;

public sealed record PendingImportedRestaurantsResultDto(
    int CampusId,
    string CampusName,
    string Source,
    int RestaurantCount,
    int ReadyCount,
    int CautionCount,
    int NeedsReviewCount,
    int RejectCount,
    IReadOnlyList<PendingImportedRestaurantDto> Restaurants);
