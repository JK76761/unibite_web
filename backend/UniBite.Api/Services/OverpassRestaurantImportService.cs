using System.Globalization;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using UniBite.Api.Configuration;
using UniBite.Api.Dtos;
using UniBite.Api.Models;

namespace UniBite.Api.Services;

public sealed class OverpassRestaurantImportService(
    UniBite.Api.Data.UniBiteDbContext dbContext,
    HttpClient httpClient,
    IOptions<OverpassOptions> options,
    ILogger<OverpassRestaurantImportService> logger)
{
    private const string ExternalSourceName = "overpass";
    private const double DuplicateMatchDistanceKm = 0.12;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private static readonly HashSet<string> GenericNames = new(StringComparer.OrdinalIgnoreCase)
    {
        "cafe",
        "coffee",
        "restaurant",
        "food court",
        "eatery",
        "kiosk",
        "cafeteria"
    };

    private readonly OverpassOptions _options = options.Value;

    public async Task<OverpassCampusImportResultDto> ImportCampusAsync(
        int campusId,
        int? radiusMeters,
        bool dryRun,
        CancellationToken cancellationToken = default)
    {
        var campus = await dbContext.Campuses
            .AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == campusId, cancellationToken);

        if (campus is null)
        {
            throw new InvalidOperationException($"Campus {campusId} could not be found.");
        }

        var resolvedRadius = Math.Clamp(radiusMeters ?? _options.SearchRadiusMeters, 250, 5000);
        var candidates = await FetchCandidatesAsync(campus, resolvedRadius, cancellationToken);

        var existingRestaurants = await dbContext.Restaurants
            .Where(item => item.CampusId == campus.Id)
            .ToListAsync(cancellationToken);

        var insertedCount = 0;
        var updatedCount = 0;
        var duplicateCount = 0;
        var previews = new List<OverpassImportedRestaurantDto>();

        foreach (var candidate in candidates)
        {
            var externalMatch = existingRestaurants.FirstOrDefault(item =>
                string.Equals(item.ExternalSource, ExternalSourceName, StringComparison.OrdinalIgnoreCase) &&
                string.Equals(item.ExternalPlaceId, candidate.ExternalPlaceId, StringComparison.Ordinal));

            if (externalMatch is not null)
            {
                if (!dryRun)
                {
                    ApplyImportedValues(externalMatch, candidate);
                }

                updatedCount++;
                previews.Add(ToPreview(candidate, "updated"));
                continue;
            }

            var duplicateMatch = existingRestaurants.FirstOrDefault(item =>
                Normalize(item.Name) == candidate.NormalizedName &&
                GetDistanceKm(item.Latitude, item.Longitude, candidate.Latitude, candidate.Longitude) <= DuplicateMatchDistanceKm);

            if (duplicateMatch is not null)
            {
                duplicateCount++;
                previews.Add(ToPreview(candidate, "matched existing"));
                continue;
            }

            if (!dryRun)
            {
                var restaurant = new Restaurant
                {
                    CampusId = campus.Id,
                    Name = candidate.Name,
                    Address = candidate.Address,
                    Cuisine = candidate.Cuisine,
                    Budget = candidate.Budget,
                    Mood = candidate.Mood,
                    Description = candidate.Description,
                    WebsiteUrl = candidate.WebsiteUrl,
                    ExternalSource = ExternalSourceName,
                    ExternalPlaceId = candidate.ExternalPlaceId,
                    PhotoUrl = null,
                    PhotoAttribution = null,
                    LastSyncedAtUtc = DateTime.UtcNow,
                    DistanceFromCampusKm = candidate.DistanceFromCampusKm,
                    Latitude = candidate.Latitude,
                    Longitude = candidate.Longitude,
                    CreatedAtUtc = DateTime.UtcNow,
                    IsApproved = false
                };

                dbContext.Restaurants.Add(restaurant);
                existingRestaurants.Add(restaurant);
            }

            insertedCount++;
            previews.Add(ToPreview(candidate, "inserted"));
        }

        if (!dryRun)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return new OverpassCampusImportResultDto(
            campus.Id,
            campus.Name,
            resolvedRadius,
            dryRun,
            candidates.Count,
            insertedCount,
            updatedCount,
            duplicateCount,
            previews
                .OrderBy(item => item.DistanceFromCampusKm)
                .ThenBy(item => item.Name)
                .Take(25)
                .ToList());
    }

    private async Task<List<ImportedRestaurantCandidate>> FetchCandidatesAsync(
        Campus campus,
        int radiusMeters,
        CancellationToken cancellationToken)
    {
        var queryAttempts = new[]
        {
            new
            {
                Label = "full",
                Query = BuildOverpassQuery(campus.Latitude, campus.Longitude, radiusMeters)
            },
            new
            {
                Label = "lightweight",
                Query = BuildLightweightOverpassQuery(campus.Latitude, campus.Longitude, radiusMeters)
            }
        };

        string? lastFailureMessage = null;

        foreach (var attempt in queryAttempts)
        {
            try
            {
                var responseBody = await ExecuteOverpassQueryAsync(
                    campus,
                    attempt.Query,
                    attempt.Label,
                    cancellationToken);

                var payload = JsonSerializer.Deserialize<OverpassResponse>(responseBody, JsonOptions);
                if (payload?.Elements is null)
                {
                    return [];
                }

                var candidates = payload.Elements
                    .Select(element => MapCandidate(element, campus))
                    .Where(candidate => candidate is not null)
                    .Cast<ImportedRestaurantCandidate>()
                    .OrderBy(candidate => candidate.DistanceFromCampusKm)
                    .ThenBy(candidate => candidate.Name)
                    .ToList();

                if (candidates.Count > 0 || attempt.Label == "lightweight")
                {
                    return DeduplicateCandidates(candidates);
                }
            }
            catch (InvalidOperationException exception)
            {
                lastFailureMessage = exception.Message;
            }
            catch (HttpRequestException exception)
            {
                logger.LogWarning(
                    exception,
                    "Overpass import HTTP request failed for campus {CampusId} on {AttemptLabel} query.",
                    campus.Id,
                    attempt.Label);

                lastFailureMessage = "Overpass import failed. Please try again in a moment.";
            }
        }

        throw new InvalidOperationException(
            lastFailureMessage ?? "Overpass import failed. Please try again in a moment.");
    }

    private async Task<string> ExecuteOverpassQueryAsync(
        Campus campus,
        string query,
        string attemptLabel,
        CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "")
        {
            Content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["data"] = query
            })
        };
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        using var response = await httpClient.SendAsync(request, cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

        if (response.IsSuccessStatusCode)
        {
            return responseBody;
        }

        logger.LogWarning(
            "Overpass import failed for campus {CampusId} on {AttemptLabel} query. Status {StatusCode}. Body: {Body}",
            campus.Id,
            attemptLabel,
            (int)response.StatusCode,
            responseBody);

        throw new InvalidOperationException("Overpass import failed. Please try again in a moment.");
    }

    private static ImportedRestaurantCandidate? MapCandidate(OverpassElement element, Campus campus)
    {
        if (element.Tags is null || IsNonOperational(element.Tags))
        {
            return null;
        }

        var name = ResolveCandidateName(element.Tags);
        if (string.IsNullOrWhiteSpace(name))
        {
            return null;
        }

        if (LooksLikeGenericCandidateName(name, element.Tags))
        {
            return null;
        }

        var latitude = element.Latitude ?? element.Center?.Latitude;
        var longitude = element.Longitude ?? element.Center?.Longitude;
        if (latitude is null || longitude is null)
        {
            return null;
        }

        var distanceKm = GetDistanceKm(campus.Latitude, campus.Longitude, latitude.Value, longitude.Value);
        var cuisine = BuildCuisine(element.Tags);
        var amenityType = FirstNonEmptyTag(element.Tags, "amenity", "shop");

        return new ImportedRestaurantCandidate(
            Name: Clamp(name, 160),
            NormalizedName: Normalize(name),
            Address: Clamp(BuildAddress(element.Tags, campus), 220),
            Cuisine: Clamp(cuisine, 160),
            Budget: BuildBudget(element.Tags),
            Mood: BuildMood(element.Tags),
            Description: Clamp(BuildDescription(campus, cuisine, amenityType, distanceKm), 600),
            WebsiteUrl: ClampNullable(FirstNonEmptyTag(element.Tags, "website", "contact:website", "url"), 240),
            ExternalPlaceId: $"{element.Type}/{element.Id}",
            Latitude: latitude.Value,
            Longitude: longitude.Value,
            DistanceFromCampusKm: Math.Round(distanceKm, 3));
    }

    private static List<ImportedRestaurantCandidate> DeduplicateCandidates(List<ImportedRestaurantCandidate> candidates)
    {
        var deduped = new List<ImportedRestaurantCandidate>();

        foreach (var candidate in candidates)
        {
            var hasExisting = deduped.Any(item =>
                item.NormalizedName == candidate.NormalizedName &&
                GetDistanceKm(item.Latitude, item.Longitude, candidate.Latitude, candidate.Longitude) <= 0.05);

            if (!hasExisting)
            {
                deduped.Add(candidate);
            }
        }

        return deduped;
    }

    private static void ApplyImportedValues(Restaurant restaurant, ImportedRestaurantCandidate candidate)
    {
        restaurant.Name = candidate.Name;
        restaurant.Address = candidate.Address;
        restaurant.Cuisine = candidate.Cuisine;
        restaurant.Budget = candidate.Budget;
        restaurant.Mood = candidate.Mood;
        restaurant.Description = candidate.Description;
        restaurant.WebsiteUrl = candidate.WebsiteUrl;
        restaurant.ExternalSource = ExternalSourceName;
        restaurant.ExternalPlaceId = candidate.ExternalPlaceId;
        restaurant.LastSyncedAtUtc = DateTime.UtcNow;
        restaurant.DistanceFromCampusKm = candidate.DistanceFromCampusKm;
        restaurant.Latitude = candidate.Latitude;
        restaurant.Longitude = candidate.Longitude;
    }

    private static OverpassImportedRestaurantDto ToPreview(ImportedRestaurantCandidate candidate, string status) =>
        new(
            candidate.Name,
            candidate.Address,
            candidate.Cuisine,
            candidate.DistanceFromCampusKm,
            status);

    private static string BuildOverpassQuery(double latitude, double longitude, int radiusMeters) =>
        $$"""
        [out:json][timeout:25];
        (
          nwr(around:{{radiusMeters}},{{latitude.ToString(CultureInfo.InvariantCulture)}},{{longitude.ToString(CultureInfo.InvariantCulture)}})["amenity"~"^(restaurant|cafe|fast_food|food_court|ice_cream)$"];
          nwr(around:{{radiusMeters}},{{latitude.ToString(CultureInfo.InvariantCulture)}},{{longitude.ToString(CultureInfo.InvariantCulture)}})["shop"~"^(bakery|sandwich)$"];
        );
        out center tags;
        """;

    private static string BuildLightweightOverpassQuery(double latitude, double longitude, int radiusMeters) =>
        $$"""
        [out:json][timeout:20];
        (
          node(around:{{radiusMeters}},{{latitude.ToString(CultureInfo.InvariantCulture)}},{{longitude.ToString(CultureInfo.InvariantCulture)}})["amenity"~"^(restaurant|cafe|fast_food|food_court|ice_cream)$"];
          node(around:{{radiusMeters}},{{latitude.ToString(CultureInfo.InvariantCulture)}},{{longitude.ToString(CultureInfo.InvariantCulture)}})["shop"~"^(bakery|sandwich)$"];
        );
        out body tags;
        """;

    private static string BuildCuisine(IReadOnlyDictionary<string, string> tags)
    {
        var cuisineTag = FirstNonEmptyTag(tags, "cuisine");
        if (!string.IsNullOrWhiteSpace(cuisineTag))
        {
                var firstCuisine = cuisineTag
                .Split([';', ',', '/'], StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
                .FirstOrDefault();

            if (!string.IsNullOrWhiteSpace(firstCuisine))
            {
                return ToDisplayLabel(firstCuisine);
            }
        }

        return FirstNonEmptyTag(tags, "amenity", "shop") switch
        {
            "cafe" => "Cafe",
            "fast_food" => "Casual Eatery",
            "food_court" => "Casual Eatery",
            "ice_cream" => "Dessert",
            "bakery" => "Cafe",
            "sandwich" => "Sandwiches",
            _ => "Casual Eatery"
        };
    }

    private static string BuildBudget(IReadOnlyDictionary<string, string> tags)
    {
        var amenity = FirstNonEmptyTag(tags, "amenity", "shop");

        return amenity switch
        {
            "restaurant" => "$$",
            "cafe" => "$",
            "fast_food" => "$",
            "food_court" => "$",
            "ice_cream" => "$",
            "bakery" => "$",
            "sandwich" => "$",
            _ => "$$"
        };
    }

    private static string BuildMood(IReadOnlyDictionary<string, string> tags)
    {
        var amenity = FirstNonEmptyTag(tags, "amenity", "shop");

        return amenity switch
        {
            "cafe" => "Study Session",
            "fast_food" => "Quick Bite",
            "food_court" => "Group Catch-up",
            "ice_cream" => "Sweet Treat",
            "bakery" => "Quick Bite",
            "sandwich" => "Quick Bite",
            _ => "Casual Meal"
        };
    }

    private static string BuildDescription(Campus campus, string cuisine, string? amenityType, double distanceKm)
    {
        var distanceMeters = Math.Max(50, (int)Math.Round(distanceKm * 1000, MidpointRounding.AwayFromZero));
        var placeType = amenityType switch
        {
            "cafe" => "cafe",
            "fast_food" => "fast casual spot",
            "food_court" => "food court option",
            "ice_cream" => "dessert stop",
            "bakery" => "bakery stop",
            "sandwich" => "sandwich spot",
            _ => "restaurant"
        };

        return $"Imported from OpenStreetMap and awaiting review. This appears to be a {cuisine.ToLowerInvariant()} {placeType} about {distanceMeters} m from {campus.Name}.";
    }

    private static string? ResolveCandidateName(IReadOnlyDictionary<string, string> tags)
    {
        var rawName = FirstNonEmptyTag(tags, "name", "brand", "operator");
        return string.IsNullOrWhiteSpace(rawName) ? null : rawName.Trim();
    }

    private static bool LooksLikeGenericCandidateName(
        string name,
        IReadOnlyDictionary<string, string> tags)
    {
        if (!GenericNames.Contains(name.Trim()))
        {
            return false;
        }

        return string.IsNullOrWhiteSpace(FirstNonEmptyTag(tags, "brand", "operator"));
    }

    private static bool IsNonOperational(IReadOnlyDictionary<string, string> tags)
    {
        if (tags.ContainsKey("disused") ||
            tags.ContainsKey("abandoned") ||
            tags.ContainsKey("demolished"))
        {
            return true;
        }

        var disusedAmenity = FirstNonEmptyTag(tags, "disused:amenity", "abandoned:amenity", "construction");
        return !string.IsNullOrWhiteSpace(disusedAmenity);
    }

    private static string BuildAddress(IReadOnlyDictionary<string, string> tags, Campus campus)
    {
        var segments = new List<string>();
        var houseNumber = FirstNonEmptyTag(tags, "addr:housenumber");
        var street = FirstNonEmptyTag(tags, "addr:street");

        if (!string.IsNullOrWhiteSpace(street))
        {
            segments.Add(string.IsNullOrWhiteSpace(houseNumber) ? street : $"{houseNumber} {street}");
        }

        AddIfMissing(segments, FirstNonEmptyTag(tags, "addr:suburb"));
        AddIfMissing(segments, FirstNonEmptyTag(tags, "addr:city"));

        if (segments.Count == 0)
        {
            segments.Add(campus.Suburb);
        }

        return string.Join(", ", segments);
    }

    private static void AddIfMissing(ICollection<string> values, string? value)
    {
        if (!string.IsNullOrWhiteSpace(value) && !values.Contains(value))
        {
            values.Add(value);
        }
    }

    private static string? FirstNonEmptyTag(IReadOnlyDictionary<string, string> tags, params string[] keys)
    {
        foreach (var key in keys)
        {
            if (tags.TryGetValue(key, out var value) && !string.IsNullOrWhiteSpace(value))
            {
                return value.Trim();
            }
        }

        return null;
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

    private static string ToDisplayLabel(string value)
    {
        var cleaned = value
            .Trim()
            .Replace('_', ' ')
            .Replace('-', ' ');

        return CultureInfo.InvariantCulture.TextInfo.ToTitleCase(cleaned.ToLowerInvariant());
    }

    private static string Clamp(string value, int maxLength) =>
        value.Length <= maxLength ? value : value[..maxLength];

    private static string? ClampNullable(string? value, int maxLength) =>
        string.IsNullOrWhiteSpace(value) ? null : Clamp(value.Trim(), maxLength);

    private static double GetDistanceKm(double startLatitude, double startLongitude, double endLatitude, double endLongitude)
    {
        var dLat = DegreesToRadians(endLatitude - startLatitude);
        var dLon = DegreesToRadians(endLongitude - startLongitude);

        var startLatRad = DegreesToRadians(startLatitude);
        var endLatRad = DegreesToRadians(endLatitude);

        var haversine =
            Math.Pow(Math.Sin(dLat / 2), 2) +
            Math.Cos(startLatRad) * Math.Cos(endLatRad) * Math.Pow(Math.Sin(dLon / 2), 2);

        var angularDistance = 2 * Math.Atan2(Math.Sqrt(haversine), Math.Sqrt(1 - haversine));
        return 6371 * angularDistance;
    }

    private static double DegreesToRadians(double degrees) => degrees * (Math.PI / 180);

    private sealed record ImportedRestaurantCandidate(
        string Name,
        string NormalizedName,
        string Address,
        string Cuisine,
        string Budget,
        string Mood,
        string Description,
        string? WebsiteUrl,
        string ExternalPlaceId,
        double Latitude,
        double Longitude,
        double DistanceFromCampusKm);

    private sealed record OverpassResponse(IReadOnlyList<OverpassElement>? Elements);

    private sealed record OverpassElement(
        long Id,
        string Type,
        double? Lat,
        double? Lon,
        OverpassCenter? Center,
        Dictionary<string, string>? Tags)
    {
        public double? Latitude => Lat;

        public double? Longitude => Lon;
    }

    private sealed record OverpassCenter(double Lat, double Lon)
    {
        public double Latitude => Lat;

        public double Longitude => Lon;
    }
}
