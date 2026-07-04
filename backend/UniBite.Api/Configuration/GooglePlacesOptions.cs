namespace UniBite.Api.Configuration;

public sealed class GooglePlacesOptions
{
    public const string SectionName = "GooglePlaces";

    public string ApiKey { get; set; } = string.Empty;

    public string TextSearchEndpoint { get; set; } = "https://places.googleapis.com/v1/places:searchText";

    public string PlacePhotosEndpointBase { get; set; } = "https://places.googleapis.com/v1/";

    public int RequestTimeoutSeconds { get; set; } = 12;

    public int PhotoMaxWidthPx { get; set; } = 960;

    public int SearchRadiusMeters { get; set; } = 250;
}
