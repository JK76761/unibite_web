using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UniBite.Api.Data;
using UniBite.Api.Dtos;
using UniBite.Api.Services;

namespace UniBite.Api.Controllers;

[ApiController]
[Route("api/admin/restaurants")]
public sealed class AdminRestaurantsController(
    UniBiteDbContext dbContext,
    GooglePlacesPreviewService googlePlacesPreviewService,
    RestaurantDataQualityService restaurantDataQualityService) : ControllerBase
{
    [HttpGet("campuses/{campusId:int}/pending-imported")]
    [ProducesResponseType(typeof(PendingImportedRestaurantsResultDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<PendingImportedRestaurantsResultDto>> GetPendingImportedRestaurants(
        int campusId,
        [FromQuery] ApproveImportedRestaurantsQuery query,
        CancellationToken cancellationToken)
    {
        var campus = await dbContext.Campuses
            .AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == campusId, cancellationToken);

        if (campus is null)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Campus not found",
                Detail = $"Campus {campusId} could not be found."
            });
        }

        var source = string.IsNullOrWhiteSpace(query.Source) ? "overpass" : query.Source.Trim();

        var campusRestaurants = await dbContext.Restaurants
            .AsNoTracking()
            .Where(item => item.CampusId == campusId)
            .OrderBy(item => item.DistanceFromCampusKm)
            .ThenBy(item => item.Name)
            .ToListAsync(cancellationToken);

        var restaurants = campusRestaurants
            .Where(item => !item.IsApproved && item.ExternalSource == source)
            .Select(item =>
            {
                var duplicateHint = FindPotentialDuplicate(item, campusRestaurants);
                var reviewAssessment = BuildReviewAssessment(item, campus, duplicateHint);

                return new PendingImportedRestaurantDto(
                    item.Id,
                    item.Name,
                    item.Address,
                    item.Cuisine,
                    item.Budget,
                    item.Mood,
                    item.Description,
                    item.WebsiteUrl,
                    item.PhotoUrl,
                    item.DistanceFromCampusKm,
                    item.Latitude,
                    item.Longitude,
                    item.ExternalSource,
                    item.ExternalPlaceId,
                    item.LastSyncedAtUtc,
                    reviewAssessment.Status,
                    reviewAssessment.Score,
                    reviewAssessment.RecommendedAction,
                    reviewAssessment.Flags,
                    reviewAssessment.Notes,
                    duplicateHint);
            })
            .OrderBy(item => GetReviewSortPriority(item.ReviewStatus))
            .ThenByDescending(item => item.ReviewScore)
            .ThenBy(item => item.DistanceFromCampusKm)
            .ThenBy(item => item.Name)
            .ToList();

        return Ok(new PendingImportedRestaurantsResultDto(
            campus.Id,
            campus.Name,
            source,
            restaurants.Count,
            restaurants.Count(item => item.ReviewStatus == "ready"),
            restaurants.Count(item => item.ReviewStatus == "caution"),
            restaurants.Count(item => item.ReviewStatus == "needs_review"),
            restaurants.Count(item => item.ReviewStatus == "reject"),
            restaurants));
    }

    [HttpPost("campuses/{campusId:int}/approve-imported")]
    public async Task<ActionResult<object>> ApproveImportedRestaurants(
        int campusId,
        [FromQuery] ApproveImportedRestaurantsQuery query,
        CancellationToken cancellationToken)
    {
        var campus = await dbContext.Campuses
            .AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == campusId, cancellationToken);

        if (campus is null)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Campus not found",
                Detail = $"Campus {campusId} could not be found."
            });
        }

        var source = string.IsNullOrWhiteSpace(query.Source) ? "overpass" : query.Source.Trim();
        var limit = query.Limit ?? 100;

        var restaurants = await dbContext.Restaurants
            .Where(item =>
                item.CampusId == campusId &&
                !item.IsApproved &&
                item.ExternalSource == source)
            .OrderBy(item => item.DistanceFromCampusKm)
            .ThenBy(item => item.Name)
            .Take(limit)
            .ToListAsync(cancellationToken);

        foreach (var restaurant in restaurants)
        {
            restaurant.IsApproved = true;
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            campusId,
            campusName = campus.Name,
            source,
            approvedCount = restaurants.Count,
            restaurants = restaurants.Select(item => new
            {
                item.Id,
                item.Name,
                item.DistanceFromCampusKm
            })
        });
    }

    [HttpPost("approve-selected")]
    public async Task<ActionResult<object>> ApproveSelectedImportedRestaurants(
        [FromBody] ImportedRestaurantSelectionRequest request,
        CancellationToken cancellationToken)
    {
        var restaurantIds = request.RestaurantIds
            .Distinct()
            .ToList();

        var restaurants = await dbContext.Restaurants
            .Where(item =>
                restaurantIds.Contains(item.Id) &&
                !item.IsApproved &&
                item.ExternalSource != null)
            .OrderBy(item => item.DistanceFromCampusKm)
            .ThenBy(item => item.Name)
            .ToListAsync(cancellationToken);

        foreach (var restaurant in restaurants)
        {
            restaurant.IsApproved = true;
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            requestedCount = restaurantIds.Count,
            approvedCount = restaurants.Count,
            restaurants = restaurants.Select(item => new
            {
                item.Id,
                item.Name,
                item.DistanceFromCampusKm
            })
        });
    }

    [HttpPost("reject-selected")]
    [ProducesResponseType(typeof(DeleteImportedRestaurantsResultDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<DeleteImportedRestaurantsResultDto>> RejectSelectedImportedRestaurants(
        [FromBody] ImportedRestaurantSelectionRequest request,
        CancellationToken cancellationToken)
    {
        var restaurantIds = request.RestaurantIds
            .Distinct()
            .ToList();

        var restaurants = await dbContext.Restaurants
            .Where(item =>
                restaurantIds.Contains(item.Id) &&
                !item.IsApproved &&
                item.ExternalSource != null)
            .OrderBy(item => item.DistanceFromCampusKm)
            .ThenBy(item => item.Name)
            .ToListAsync(cancellationToken);

        dbContext.Restaurants.RemoveRange(restaurants);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new DeleteImportedRestaurantsResultDto(
            restaurantIds.Count,
            restaurants.Count,
            restaurants
                .Select(item => new DeletedImportedRestaurantDto(item.Id, item.Name))
                .ToList()));
    }

    [HttpPost("campuses/{campusId:int}/normalize-data")]
    [ProducesResponseType(typeof(NormalizeRestaurantDataResultDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<NormalizeRestaurantDataResultDto>> NormalizeCampusData(
        int campusId,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await restaurantDataQualityService.NormalizeAsync(campusId, cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException exception)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Campus not found",
                Detail = exception.Message
            });
        }
    }

    [HttpGet("{restaurantId:int}/google-places-preview")]
    [ProducesResponseType(typeof(GooglePlacesPreviewDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<GooglePlacesPreviewDto>> PreviewGooglePlaces(
        int restaurantId,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await googlePlacesPreviewService.PreviewRestaurantAsync(restaurantId, cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException exception)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Restaurant not found",
                Detail = exception.Message
            });
        }
    }

    private static ReviewAssessment BuildReviewAssessment(
        Models.Restaurant restaurant,
        Models.Campus campus,
        PendingImportedDuplicateHintDto? duplicateHint)
    {
        var flags = new List<string>();
        var notes = new List<string>();
        var score = 100;

        if (duplicateHint is not null)
        {
            flags.Add(duplicateHint.IsApproved ? "Possible live duplicate" : "Possible queue duplicate");
            notes.Add(
                duplicateHint.IsApproved
                    ? $"Looks similar to the live listing \"{duplicateHint.Name}\"."
                    : $"Looks similar to another imported item: \"{duplicateHint.Name}\".");
            score -= duplicateHint.IsApproved ? 42 : 28;
        }

        if (string.IsNullOrWhiteSpace(restaurant.PhotoUrl))
        {
            flags.Add("No photo");
            notes.Add("No stored image yet, so the card will rely on UniBite artwork only.");
            score -= 10;
        }

        if (string.IsNullOrWhiteSpace(restaurant.WebsiteUrl))
        {
            flags.Add("No website");
            notes.Add("No official website was detected from the source tags.");
            score -= 6;
        }

        if (RestaurantDataQualityService.LooksGenericDescription(restaurant.Description))
        {
            flags.Add("Generic description");
            notes.Add("Description still reads like imported placeholder copy and may need editing.");
            score -= 14;
        }

        if (string.Equals(restaurant.Cuisine, "Casual Eatery", StringComparison.OrdinalIgnoreCase))
        {
            flags.Add("Broad cuisine tag");
            notes.Add("Cuisine is still broad, so students may struggle to judge what this spot offers.");
            score -= 11;
        }

        if (HasVagueAddress(restaurant.Address, campus.Suburb))
        {
            flags.Add("Weak address");
            notes.Add("Address is vague, which makes map verification harder.");
            score -= 12;
        }

        if (restaurant.DistanceFromCampusKm > 1.5)
        {
            flags.Add("Far from campus");
            notes.Add("This spot is further out than most first-pass student picks.");
            score -= 8;
        }

        if (LooksLikeGenericVenueName(restaurant.Name))
        {
            flags.Add("Generic venue name");
            notes.Add("The imported name is generic enough that it may not represent a real storefront.");
            score -= 30;
        }

        score = Math.Clamp(score, 0, 100);

        var status = score switch
        {
            >= 80 => "ready",
            >= 60 => "caution",
            >= 38 => "needs_review",
            _ => "reject"
        };

        if (duplicateHint?.IsApproved == true && status == "ready")
        {
            status = "needs_review";
        }

        var recommendedAction = status switch
        {
            "ready" => "Approve after a quick final glance.",
            "caution" => "Approve if the name and address look right.",
            "needs_review" => "Review manually before publishing.",
            _ => "Reject or edit before keeping.",
        };

        return new ReviewAssessment(score, status, recommendedAction, flags, notes);
    }

    private static PendingImportedDuplicateHintDto? FindPotentialDuplicate(
        Models.Restaurant restaurant,
        IReadOnlyList<Models.Restaurant> campusRestaurants)
    {
        return campusRestaurants
            .Where(candidate => candidate.Id != restaurant.Id)
            .Select(candidate => BuildDuplicateHint(restaurant, candidate))
            .Where(candidate => candidate is not null)
            .Cast<PendingImportedDuplicateHintDto>()
            .OrderBy(candidate => candidate.IsApproved ? 0 : 1)
            .ThenBy(candidate => candidate.DistanceKm)
            .FirstOrDefault();
    }

    private static PendingImportedDuplicateHintDto? BuildDuplicateHint(
        Models.Restaurant restaurant,
        Models.Restaurant candidate)
    {
        var locationDistanceKm = GetDistanceKm(
            restaurant.Latitude,
            restaurant.Longitude,
            candidate.Latitude,
            candidate.Longitude);

        var restaurantName = NormalizeName(restaurant.Name);
        var candidateName = NormalizeName(candidate.Name);
        var restaurantHost = GetWebsiteHost(restaurant.WebsiteUrl);
        var candidateHost = GetWebsiteHost(candidate.WebsiteUrl);

        if (!string.IsNullOrWhiteSpace(restaurantHost) &&
            string.Equals(restaurantHost, candidateHost, StringComparison.OrdinalIgnoreCase))
        {
            return new PendingImportedDuplicateHintDto(
                candidate.Id,
                candidate.Name,
                candidate.IsApproved,
                Math.Round(locationDistanceKm, 3),
                "same website");
        }

        if (restaurantName == candidateName && locationDistanceKm <= 0.25)
        {
            return new PendingImportedDuplicateHintDto(
                candidate.Id,
                candidate.Name,
                candidate.IsApproved,
                Math.Round(locationDistanceKm, 3),
                "same name nearby");
        }

        var tokenOverlap = GetTokenOverlapScore(restaurantName, candidateName);
        if (tokenOverlap >= 0.74 && locationDistanceKm <= 0.18)
        {
            return new PendingImportedDuplicateHintDto(
                candidate.Id,
                candidate.Name,
                candidate.IsApproved,
                Math.Round(locationDistanceKm, 3),
                "similar name nearby");
        }

        if (string.Equals(
                NormalizeName(restaurant.Address),
                NormalizeName(candidate.Address),
                StringComparison.Ordinal) &&
            locationDistanceKm <= 0.12)
        {
            return new PendingImportedDuplicateHintDto(
                candidate.Id,
                candidate.Name,
                candidate.IsApproved,
                Math.Round(locationDistanceKm, 3),
                "same address");
        }

        return null;
    }

    private static string NormalizeName(string value) =>
        string.Join(
            ' ',
            new string(
                value
                    .Trim()
                    .ToLowerInvariant()
                    .Select(character => char.IsLetterOrDigit(character) ? character : ' ')
                    .ToArray())
                .Split(' ', StringSplitOptions.RemoveEmptyEntries)
        );

    private static bool HasVagueAddress(string address, string suburb)
    {
        var normalizedAddress = NormalizeName(address);
        var normalizedSuburb = NormalizeName(suburb);

        return string.IsNullOrWhiteSpace(normalizedAddress) ||
               normalizedAddress == normalizedSuburb ||
               normalizedAddress.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length <= 2;
    }

    private static bool LooksLikeGenericVenueName(string name)
    {
        var normalizedName = NormalizeName(name);

        return normalizedName is
            "cafe" or
            "restaurant" or
            "coffee" or
            "food court" or
            "eatery" or
            "kiosk" or
            "cafeteria";
    }

    private static string? GetWebsiteHost(string? websiteUrl)
    {
        if (string.IsNullOrWhiteSpace(websiteUrl) ||
            !Uri.TryCreate(websiteUrl, UriKind.Absolute, out var uri))
        {
            return null;
        }

        var host = uri.Host.ToLowerInvariant();
        return host is "example.com" or "www.example.com" ? null : host;
    }

    private static double GetTokenOverlapScore(string left, string right)
    {
        var leftTokens = left.Split(' ', StringSplitOptions.RemoveEmptyEntries).ToHashSet();
        var rightTokens = right.Split(' ', StringSplitOptions.RemoveEmptyEntries).ToHashSet();

        if (leftTokens.Count == 0 || rightTokens.Count == 0)
        {
            return 0;
        }

        var intersectionCount = leftTokens.Intersect(rightTokens).Count();
        return intersectionCount / (double)Math.Max(leftTokens.Count, rightTokens.Count);
    }

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

    private static int GetReviewSortPriority(string reviewStatus) => reviewStatus switch
    {
        "ready" => 0,
        "caution" => 1,
        "needs_review" => 2,
        _ => 3
    };

    private sealed record ReviewAssessment(
        int Score,
        string Status,
        string RecommendedAction,
        IReadOnlyList<string> Flags,
        IReadOnlyList<string> Notes);
}
