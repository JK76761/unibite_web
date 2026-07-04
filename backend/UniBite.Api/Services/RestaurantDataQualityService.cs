using Microsoft.EntityFrameworkCore;
using UniBite.Api.Data;
using UniBite.Api.Dtos;
using UniBite.Api.Models;

namespace UniBite.Api.Services;

public sealed class RestaurantDataQualityService(
    UniBiteDbContext dbContext,
    ILogger<RestaurantDataQualityService> logger)
{
    private static readonly HashSet<string> ValidBudgets = ["$", "$$", "$$$"];
    private static readonly HashSet<string> ValidMoods =
    [
        "Adventurous",
        "Cheat Day",
        "Comfort Bowl",
        "Date Night",
        "Group Catch-up",
        "Hearty Meal",
        "Late Night",
        "Post Gym",
        "Quick Bite",
        "Social Lunch",
        "Study Session",
        "Sweet Treat"
    ];

    private static readonly Dictionary<string, string> CanonicalCuisineMap =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["asian"] = "Casual Eatery",
            ["burger"] = "Burgers",
            ["burgers"] = "Burgers",
            ["bagel"] = "Cafe",
            ["bakery"] = "Cafe",
            ["breakfast"] = "Cafe",
            ["bubble tea"] = "Bubble Tea",
            ["cake"] = "Dessert",
            ["casual eatery"] = "Casual Eatery",
            ["chicken"] = "Casual Eatery",
            ["coffee shop"] = "Cafe",
            ["crepe"] = "Dessert",
            ["fast food"] = "Casual Eatery",
            ["frozen yogurt"] = "Dessert",
            ["ice cream"] = "Dessert",
            ["international"] = "Casual Eatery",
            ["juice"] = "Healthy",
            ["kebab"] = "Middle Eastern",
            ["regional"] = "Modern Australian",
            ["sandwich"] = "Sandwiches",
            ["sushi"] = "Japanese"
        };

    public async Task<NormalizeRestaurantDataResultDto> NormalizeAsync(
        int? campusId = null,
        CancellationToken cancellationToken = default)
    {
        var campusName = "All campuses";

        if (campusId is not null)
        {
            var campus = await dbContext.Campuses
                .AsNoTracking()
                .SingleOrDefaultAsync(item => item.Id == campusId, cancellationToken);

            if (campus is null)
            {
                throw new InvalidOperationException($"Campus {campusId} could not be found.");
            }

            campusName = campus.Name;
        }

        var restaurants = await dbContext.Restaurants
            .Include(item => item.Campus)
            .Where(item => campusId == null || item.CampusId == campusId)
            .OrderBy(item => item.CampusId)
            .ThenBy(item => item.Name)
            .ToListAsync(cancellationToken);

        var updatedCount = 0;
        var namesNormalizedCount = 0;
        var classificationsUpdatedCount = 0;
        var descriptionsRefreshedCount = 0;
        var websitesClearedCount = 0;

        foreach (var restaurant in restaurants)
        {
            var name = NormalizeWhitespace(restaurant.Name);
            var address = NormalizeWhitespace(restaurant.Address);
            var cuisine = NormalizeCuisine(restaurant.Cuisine, restaurant.Name, restaurant.Description);
            var budget = NormalizeBudget(restaurant.Budget, cuisine);
            var mood = NormalizeMood(restaurant.Mood, cuisine, budget, restaurant.Name, restaurant.Description);
            var websiteUrl = NormalizeWebsiteUrl(restaurant.WebsiteUrl);
            var description = NormalizeDescription(restaurant, cuisine, mood);

            var changed = false;

            if (!string.Equals(restaurant.Name, name, StringComparison.Ordinal))
            {
                restaurant.Name = name;
                namesNormalizedCount++;
                changed = true;
            }

            if (!string.Equals(restaurant.Address, address, StringComparison.Ordinal))
            {
                restaurant.Address = address;
                changed = true;
            }

            if (!string.Equals(restaurant.Cuisine, cuisine, StringComparison.Ordinal) ||
                !string.Equals(restaurant.Budget, budget, StringComparison.Ordinal) ||
                !string.Equals(restaurant.Mood, mood, StringComparison.Ordinal))
            {
                restaurant.Cuisine = cuisine;
                restaurant.Budget = budget;
                restaurant.Mood = mood;
                classificationsUpdatedCount++;
                changed = true;
            }

            if (!string.Equals(restaurant.WebsiteUrl, websiteUrl, StringComparison.Ordinal))
            {
                restaurant.WebsiteUrl = websiteUrl;

                if (restaurant.WebsiteUrl is null)
                {
                    websitesClearedCount++;
                }

                changed = true;
            }

            if (!string.Equals(restaurant.Description, description, StringComparison.Ordinal))
            {
                restaurant.Description = description;
                descriptionsRefreshedCount++;
                changed = true;
            }

            if (changed)
            {
                updatedCount++;
            }
        }

        if (updatedCount > 0)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        logger.LogInformation(
            "Restaurant data normalization complete for {CampusName}. Scanned {ScannedCount}, updated {UpdatedCount}.",
            campusName,
            restaurants.Count,
            updatedCount);

        return new NormalizeRestaurantDataResultDto(
            campusId,
            campusName,
            restaurants.Count,
            updatedCount,
            namesNormalizedCount,
            classificationsUpdatedCount,
            descriptionsRefreshedCount,
            websitesClearedCount);
    }

    public static bool LooksGenericDescription(string? description)
    {
        if (string.IsNullOrWhiteSpace(description))
        {
            return true;
        }

        var trimmed = description.Trim();
        return trimmed.StartsWith("Imported from OpenStreetMap", StringComparison.OrdinalIgnoreCase) ||
               trimmed.StartsWith("Imported from OpenStreetMap and awaiting review", StringComparison.OrdinalIgnoreCase);
    }

    private static string NormalizeCuisine(string cuisine, string restaurantName, string description)
    {
        var normalizedCuisine = NormalizeWhitespace(cuisine);
        if (string.IsNullOrWhiteSpace(normalizedCuisine))
        {
            normalizedCuisine = "Casual Eatery";
        }

        if (CanonicalCuisineMap.TryGetValue(normalizedCuisine, out var mappedCuisine))
        {
            normalizedCuisine = mappedCuisine;
        }

        if (normalizedCuisine is "Asian" or "International" or "Casual Eatery" or "Regional")
        {
            var inferredCuisine = InferCuisineFromText($"{restaurantName} {description}");
            if (!string.IsNullOrWhiteSpace(inferredCuisine))
            {
                normalizedCuisine = inferredCuisine;
            }
        }

        return normalizedCuisine;
    }

    private static string? InferCuisineFromText(string value)
    {
        var normalized = value.ToLowerInvariant();

        if (ContainsAny(normalized, "bubble tea", "boba", "milk tea"))
        {
            return "Bubble Tea";
        }

        if (ContainsAny(normalized, "coffee", "cafe", "espresso", "toastie", "pastry", "brunch"))
        {
            return "Cafe";
        }

        if (ContainsAny(normalized, "burger", "fries"))
        {
            return "Burgers";
        }

        if (ContainsAny(normalized, "pizza", "pasta", "osteria", "ristorante", "tiramisu"))
        {
            return "Italian";
        }

        if (ContainsAny(normalized, "ramen", "sushi", "gyoza", "katsu", "donburi", "bento"))
        {
            return "Japanese";
        }

        if (ContainsAny(normalized, "pho", "banh", "viet"))
        {
            return "Vietnamese";
        }

        if (ContainsAny(normalized, "noodle", "dumpling", "bao", "wok"))
        {
            return "Chinese";
        }

        if (ContainsAny(normalized, "laksa", "satay", "nasi", "roti"))
        {
            return "Malaysian";
        }

        if (ContainsAny(normalized, "taco", "burrito", "quesadilla"))
        {
            return "Mexican";
        }

        if (ContainsAny(normalized, "souvlaki", "gyro", "greek"))
        {
            return "Greek";
        }

        if (ContainsAny(normalized, "kebab", "shawarma", "falafel"))
        {
            return "Middle Eastern";
        }

        if (ContainsAny(normalized, "crepe", "gelato", "ice cream", "dessert", "chocolate"))
        {
            return "Dessert";
        }

        if (ContainsAny(normalized, "smoothie", "juice", "salad", "acai", "protein"))
        {
            return "Healthy";
        }

        if (ContainsAny(normalized, "curry"))
        {
            return "Thai";
        }

        return null;
    }

    private static string NormalizeBudget(string budget, string cuisine)
    {
        var normalizedBudget = NormalizeWhitespace(budget);
        if (ValidBudgets.Contains(normalizedBudget))
        {
            return normalizedBudget;
        }

        return cuisine switch
        {
            "Cafe" or "Dessert" or "Healthy" or "Bubble Tea" or "Sandwiches" or "Burgers"
                => "$",
            "Modern Australian" => "$$$",
            _ => "$$"
        };
    }

    private static string NormalizeMood(
        string mood,
        string cuisine,
        string budget,
        string restaurantName,
        string description)
    {
        var normalizedMood = NormalizeWhitespace(mood);
        if (ValidMoods.Contains(normalizedMood))
        {
            return normalizedMood;
        }

        var normalizedText = $"{restaurantName} {description}".ToLowerInvariant();

        if (ContainsAny(normalizedText, "late", "night"))
        {
            return "Late Night";
        }

        if (cuisine is "Cafe")
        {
            return "Study Session";
        }

        if (cuisine is "Dessert" or "Bubble Tea")
        {
            return "Sweet Treat";
        }

        if (cuisine is "Healthy")
        {
            return "Post Gym";
        }

        if (cuisine is "Burgers")
        {
            return budget == "$" ? "Quick Bite" : "Cheat Day";
        }

        if (cuisine is "Sandwiches" or "Chinese" or "Mexican")
        {
            return "Quick Bite";
        }

        if (cuisine is "Japanese" or "Malaysian" or "Thai" or "Vietnamese")
        {
            return "Comfort Bowl";
        }

        if (cuisine is "Italian" or "Pizza" or "Greek" or "Middle Eastern")
        {
            return "Group Catch-up";
        }

        if (cuisine is "Modern Australian")
        {
            return "Date Night";
        }

        return budget == "$" ? "Quick Bite" : "Social Lunch";
    }

    private static string? NormalizeWebsiteUrl(string? websiteUrl)
    {
        if (string.IsNullOrWhiteSpace(websiteUrl))
        {
            return null;
        }

        var normalizedWebsite = websiteUrl.Trim();

        if (!Uri.TryCreate(normalizedWebsite, UriKind.Absolute, out var uri))
        {
            return null;
        }

        var host = uri.Host.Trim().ToLowerInvariant();
        if (host is "example.com" or "www.example.com")
        {
            return null;
        }

        return normalizedWebsite;
    }

    private static string NormalizeDescription(Restaurant restaurant, string cuisine, string mood)
    {
        if (!LooksGenericDescription(restaurant.Description))
        {
            return NormalizeWhitespace(restaurant.Description);
        }

        var campusName = restaurant.Campus?.Name ?? "campus";
        var distanceMeters = Math.Max(
            70,
            (int)Math.Round(restaurant.DistanceFromCampusKm * 1000, MidpointRounding.AwayFromZero));

        var intro = cuisine switch
        {
            "Cafe" => "Coffee, laptop-friendly tables, and an easy stop between classes.",
            "Bubble Tea" => "A quick sweet stop for boba, iced drinks, and fast catch-ups.",
            "Dessert" => "A sweet detour when you want a low-commitment treat between lectures.",
            "Healthy" => "Fresh bowls, wraps, or smoothies that work well for a lighter campus meal.",
            "Burgers" => "A filling pick when you want something indulgent and fast.",
            "Japanese" or "Malaysian" or "Thai" or "Vietnamese" => "A strong comfort-food option for a warm lunch or dinner close to campus.",
            _ => "A student-friendly food stop that is easy to work into a campus day."
        };

        var closer = mood switch
        {
            "Study Session" => $"Best suited to slower study blocks around {campusName}.",
            "Quick Bite" => $"Good when you only have a short gap before your next class at {campusName}.",
            "Group Catch-up" => $"Works well for casual meals with friends near {campusName}.",
            "Date Night" => $"A more polished option for longer meals after classes at {campusName}.",
            "Late Night" => $"Handy to know about when late labs or project work stretch into the evening.",
            _ => $"Roughly {distanceMeters} m from {campusName}, so it stays convenient for a campus food run."
        };

        return $"{intro} {closer}";
    }

    private static string NormalizeWhitespace(string value) =>
        string.Join(' ', value.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries));

    private static bool ContainsAny(string value, params string[] needles) =>
        needles.Any(needle => value.Contains(needle, StringComparison.OrdinalIgnoreCase));
}
