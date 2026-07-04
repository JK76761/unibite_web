namespace UniBite.Api.Configuration;

public sealed class OverpassOptions
{
    public const string SectionName = "Overpass";

    public string EndpointUrl { get; set; } = "https://overpass-api.de/api/interpreter";

    public int SearchRadiusMeters { get; set; } = 1800;

    public int RequestTimeoutSeconds { get; set; } = 25;
}
