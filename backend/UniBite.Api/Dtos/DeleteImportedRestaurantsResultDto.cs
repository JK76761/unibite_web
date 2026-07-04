namespace UniBite.Api.Dtos;

public sealed record DeleteImportedRestaurantsResultDto(
    int RequestedCount,
    int DeletedCount,
    IReadOnlyList<DeletedImportedRestaurantDto> Restaurants);

public sealed record DeletedImportedRestaurantDto(
    int Id,
    string Name);
