using System.Globalization;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using UniBite.Api.Configuration;
using UniBite.Api.Data;
using UniBite.Api.Dtos;

namespace UniBite.Api.Services;

public sealed class GooglePlacesPreviewService(
    UniBiteDbContext dbContext,
    HttpClient httpClient,
    IOptions<GooglePlacesOptions> options,
    ILogger<GooglePlacesPreviewService> logger)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly GooglePlacesOptions _options = options.Value;

    public async Task<GooglePlacesPreviewDto> PreviewRestaurantAsync(int restaurantId, CancellationToken cancellationToken = default)
    {
        var restaurant = await dbContext.Restaurants
            .AsNoTracking()
            .Include(item => item.Campus)
            .SingleOrDefaultAsync(item => item.Id == restaurantId, cancellationToken);

        if (restaurant is null)
        {
            throw new InvalidOperationException($"Restaurant {restaurantId} could not be found.");
        }

        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            return new GooglePlacesPreviewDto(
                restaurant.Id,
                false,
                false,
                "Google Places API key is not configured.",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null);
        }

        var searchResults = await SearchPlacesAsync(restaurant, cancellationToken);
        var bestMatch = searchResults
            .OrderByDescending(item => CalculateMatchScore(restaurant.Name, item.DisplayName))
            .ThenBy(item => GetDistanceMeters(restaurant.Latitude, restaurant.Longitude, item.Latitude, item.Longitude))
            .FirstOrDefault();

        if (bestMatch is null)
        {
            return new GooglePlacesPreviewDto(
                restaurant.Id,
                true,
                false,
                "No Google Places match was found nearby.",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null);
        }

        string? photoUrl = null;
        string? photoAttribution = null;

        if (!string.IsNullOrWhiteSpace(bestMatch.PhotoName))
        {
            (photoUrl, photoAttribution) = await GetPhotoPreviewAsync(
                bestMatch.PhotoName,
                bestMatch.PhotoAuthorAttributions,
                cancellationToken);
        }

        return new GooglePlacesPreviewDto(
            restaurant.Id,
            true,
            true,
            "Google Places preview loaded.",
            bestMatch.PlaceId,
            bestMatch.DisplayName,
            bestMatch.FormattedAddress,
            bestMatch.WebsiteUrl,
            bestMatch.GoogleMapsUri,
            photoUrl,
            photoAttribution,
            Math.Round(GetDistanceMeters(restaurant.Latitude, restaurant.Longitude, bestMatch.Latitude, bestMatch.Longitude), 1));
    }

    private async Task<List<GooglePlaceSearchResult>> SearchPlacesAsync(Models.Restaurant restaurant, CancellationToken cancellationToken)
    {
        var requestBody = new
        {
            textQuery = BuildSearchQuery(restaurant),
            pageSize = 5,
            locationBias = new
            {
                circle = new
                {
                    center = new
                    {
                        latitude = restaurant.Latitude,
                        longitude = restaurant.Longitude
                    },
                    radius = (double)_options.SearchRadiusMeters
                }
            }
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, _options.TextSearchEndpoint);
        request.Headers.TryAddWithoutValidation("X-Goog-Api-Key", _options.ApiKey);
        request.Headers.TryAddWithoutValidation(
            "X-Goog-FieldMask",
            "places.id,places.displayName,places.formattedAddress,places.location,places.websiteUri,places.googleMapsUri,places.photos");
        request.Content = new StringContent(
            JsonSerializer.Serialize(requestBody, JsonOptions),
            Encoding.UTF8,
            "application/json");

        using var response = await httpClient.SendAsync(request, cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning(
                "Google Places text search failed for restaurant {RestaurantId}. Status {StatusCode}. Body: {Body}",
                restaurant.Id,
                (int)response.StatusCode,
                responseBody);

            throw new InvalidOperationException("Google Places preview failed.");
        }

        var payload = JsonSerializer.Deserialize<GooglePlacesSearchResponse>(responseBody, JsonOptions);

        return payload?.Places?
            .Where(item => item.DisplayName?.Text is not null && item.Location is not null)
            .Select(item => new GooglePlaceSearchResult(
                item.Id,
                item.DisplayName!.Text!,
                item.FormattedAddress,
                item.WebsiteUri,
                item.GoogleMapsUri,
                item.Location!.Latitude,
                item.Location.Longitude,
                item.Photos?.FirstOrDefault()?.Name,
                item.Photos?.FirstOrDefault()?.AuthorAttributions))
            .ToList() ?? [];
    }

    private async Task<(string? PhotoUrl, string? PhotoAttribution)> GetPhotoPreviewAsync(
        string photoName,
        IReadOnlyList<GoogleAuthorAttribution>? authorAttributions,
        CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"{_options.PlacePhotosEndpointBase.TrimEnd('/')}/{photoName}/media?skipHttpRedirect=true&maxWidthPx={_options.PhotoMaxWidthPx.ToString(CultureInfo.InvariantCulture)}");
        request.Headers.TryAddWithoutValidation("X-Goog-Api-Key", _options.ApiKey);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        using var response = await httpClient.SendAsync(request, cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning(
                "Google Places photo preview failed. Status {StatusCode}. Body: {Body}",
                (int)response.StatusCode,
                responseBody);

            return (null, null);
        }

        var payload = JsonSerializer.Deserialize<GooglePhotoMediaResponse>(responseBody, JsonOptions);
        var attribution = authorAttributions is null || authorAttributions.Count == 0
            ? null
            : string.Join(
                " · ",
                authorAttributions
                    .Where(item => !string.IsNullOrWhiteSpace(item.DisplayName))
                    .Select(item => string.IsNullOrWhiteSpace(item.Uri)
                        ? item.DisplayName!
                        : $"{item.DisplayName} ({item.Uri})"));

        return (payload?.PhotoUri, attribution);
    }

    private static string BuildSearchQuery(Models.Restaurant restaurant)
    {
        var segments = new[]
        {
            restaurant.Name,
            restaurant.Address,
            restaurant.Campus?.Suburb,
            "Brisbane",
            "Australia"
        };

        return string.Join(
            ", ",
            segments.Where(segment => !string.IsNullOrWhiteSpace(segment)));
    }

    private static int CalculateMatchScore(string restaurantName, string candidateName)
    {
        var normalizedRestaurant = Normalize(restaurantName);
        var normalizedCandidate = Normalize(candidateName);

        if (normalizedRestaurant == normalizedCandidate)
        {
            return 100;
        }

        if (normalizedCandidate.Contains(normalizedRestaurant, StringComparison.Ordinal))
        {
            return 80;
        }

        if (normalizedRestaurant.Contains(normalizedCandidate, StringComparison.Ordinal))
        {
            return 70;
        }

        return normalizedRestaurant
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Count(token => normalizedCandidate.Contains(token, StringComparison.Ordinal)) * 10;
    }

    private static string Normalize(string value)
    {
        var lettersAndDigits = value
            .Trim()
            .ToLowerInvariant()
            .Select(character => char.IsLetterOrDigit(character) ? character : ' ')
            .ToArray();

        return string.Join(
            ' ',
            new string(lettersAndDigits)
                .Split(' ', StringSplitOptions.RemoveEmptyEntries));
    }

    private static double GetDistanceMeters(double startLatitude, double startLongitude, double endLatitude, double endLongitude)
    {
        var dLat = DegreesToRadians(endLatitude - startLatitude);
        var dLon = DegreesToRadians(endLongitude - startLongitude);

        var startLatRad = DegreesToRadians(startLatitude);
        var endLatRad = DegreesToRadians(endLatitude);

        var haversine =
            Math.Pow(Math.Sin(dLat / 2), 2) +
            Math.Cos(startLatRad) * Math.Cos(endLatRad) * Math.Pow(Math.Sin(dLon / 2), 2);

        var angularDistance = 2 * Math.Atan2(Math.Sqrt(haversine), Math.Sqrt(1 - haversine));
        return 6371000 * angularDistance;
    }

    private static double DegreesToRadians(double degrees) => degrees * (Math.PI / 180);

    private sealed record GooglePlacesSearchResponse(IReadOnlyList<GooglePlace>? Places);

    private sealed record GooglePlace(
        string? Id,
        GoogleDisplayName? DisplayName,
        string? FormattedAddress,
        string? WebsiteUri,
        string? GoogleMapsUri,
        GoogleLocation? Location,
        IReadOnlyList<GooglePhoto>? Photos);

    private sealed record GoogleDisplayName(string? Text);

    private sealed record GoogleLocation(double Latitude, double Longitude);

    private sealed record GooglePhoto(string? Name, IReadOnlyList<GoogleAuthorAttribution>? AuthorAttributions);

    private sealed record GoogleAuthorAttribution(string? DisplayName, string? Uri);

    private sealed record GooglePhotoMediaResponse(string? PhotoUri);

    private sealed record GooglePlaceSearchResult(
        string? PlaceId,
        string DisplayName,
        string? FormattedAddress,
        string? WebsiteUrl,
        string? GoogleMapsUri,
        double Latitude,
        double Longitude,
        string? PhotoName,
        IReadOnlyList<GoogleAuthorAttribution>? PhotoAuthorAttributions);
}
