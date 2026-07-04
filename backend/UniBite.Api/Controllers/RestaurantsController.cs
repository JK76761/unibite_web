using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;
using UniBite.Api.Data;
using UniBite.Api.Dtos;
using UniBite.Api.Models;

namespace UniBite.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class RestaurantsController(UniBiteDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<RestaurantSummaryDto>>> GetRestaurants([FromQuery] RestaurantQueryParameters query)
    {
        var restaurants = await ApplyFilters(BuildApprovedRestaurantQuery(), query)
            .OrderBy(restaurant => restaurant.DistanceFromCampusKm)
            .ThenBy(restaurant => restaurant.Name)
            .Select(MapToSummary())
            .ToListAsync();

        return Ok(restaurants);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<RestaurantDetailDto>> GetRestaurant(int id)
    {
        var restaurant = await dbContext.Restaurants
            .AsNoTracking()
            .Include(item => item.Campus)
            .Include(item => item.Ratings.OrderByDescending(rating => rating.CreatedAtUtc))
            .FirstOrDefaultAsync(item => item.Id == id && item.IsApproved);

        if (restaurant is null || restaurant.Campus is null)
        {
            return NotFound();
        }

        var approvedRestaurantCount = await dbContext.Restaurants
            .AsNoTracking()
            .CountAsync(item => item.CampusId == restaurant.CampusId && item.IsApproved);

        return Ok(new RestaurantDetailDto(
            restaurant.Id,
            restaurant.Name,
            restaurant.Address,
            restaurant.Cuisine,
            restaurant.Budget,
            restaurant.Mood,
            restaurant.Description,
            restaurant.WebsiteUrl,
            restaurant.PhotoUrl,
            restaurant.DistanceFromCampusKm,
            restaurant.Latitude,
            restaurant.Longitude,
            restaurant.IsApproved,
            restaurant.CreatedAtUtc,
            restaurant.Ratings.Count == 0 ? null : restaurant.Ratings.Average(rating => (double)rating.Score),
            restaurant.Ratings.Count,
            new CampusDto(
                restaurant.Campus.Id,
                restaurant.Campus.Name,
                restaurant.Campus.University,
                restaurant.Campus.Suburb,
                restaurant.Campus.Latitude,
                restaurant.Campus.Longitude,
                approvedRestaurantCount),
            restaurant.Ratings
                .OrderByDescending(rating => rating.CreatedAtUtc)
                .Select(rating => new RatingDto(
                    rating.Id,
                    rating.ReviewerName,
                    rating.Score,
                    rating.Comment,
                    rating.CreatedAtUtc))
                .ToList()));
    }

    [HttpGet("recommendation/random")]
    public async Task<ActionResult<RestaurantSummaryDto>> GetRandomRecommendation([FromQuery] RestaurantQueryParameters query)
    {
        var matches = await ApplyFilters(BuildApprovedRestaurantQuery(), query)
            .Select(MapToSummary())
            .ToListAsync();

        if (matches.Count == 0)
        {
            return NotFound(new ProblemDetails
            {
                Title = "No matching restaurants found.",
                Detail = "Try broadening your filters or selecting a different campus."
            });
        }

        var recommendation = matches[Random.Shared.Next(matches.Count)];
        return Ok(recommendation);
    }

    [HttpPost]
    public async Task<ActionResult<object>> CreateRestaurant([FromBody] CreateRestaurantRequest request)
    {
        var campus = await dbContext.Campuses.FirstOrDefaultAsync(item => item.Id == request.CampusId);
        if (campus is null)
        {
            ModelState.AddModelError(nameof(request.CampusId), "The selected campus could not be found.");
            return ValidationProblem(ModelState);
        }

        var restaurant = new Restaurant
        {
            CampusId = campus.Id,
            Name = request.Name.Trim(),
            Address = request.Address.Trim(),
            Cuisine = request.Cuisine.Trim(),
            Budget = request.Budget.Trim(),
            Mood = request.Mood.Trim(),
            Description = request.Description.Trim(),
            DistanceFromCampusKm = request.DistanceFromCampusKm,
            Latitude = request.Latitude ?? campus.Latitude,
            Longitude = request.Longitude ?? campus.Longitude,
            WebsiteUrl = string.IsNullOrWhiteSpace(request.WebsiteUrl) ? null : request.WebsiteUrl.Trim(),
            CreatedAtUtc = DateTime.UtcNow,
            IsApproved = false
        };

        dbContext.Restaurants.Add(restaurant);
        await dbContext.SaveChangesAsync();

        return StatusCode(StatusCodes.Status201Created, new
        {
            restaurant.Id,
            restaurant.Name,
            restaurant.IsApproved,
            message = "Thanks for the suggestion. It has been saved for review."
        });
    }

    [HttpPost("{id:int}/ratings")]
    public async Task<ActionResult<object>> CreateRating(int id, [FromBody] CreateRatingRequest request)
    {
        var restaurant = await dbContext.Restaurants
            .Include(item => item.Ratings)
            .FirstOrDefaultAsync(item => item.Id == id && item.IsApproved);

        if (restaurant is null)
        {
            return NotFound();
        }

        var rating = new Rating
        {
            RestaurantId = restaurant.Id,
            ReviewerName = request.ReviewerName.Trim(),
            Score = request.Score,
            Comment = string.IsNullOrWhiteSpace(request.Comment) ? null : request.Comment.Trim(),
            CreatedAtUtc = DateTime.UtcNow
        };

        dbContext.Ratings.Add(rating);
        await dbContext.SaveChangesAsync();

        var ratings = restaurant.Ratings
            .Append(rating)
            .ToList();

        return StatusCode(StatusCodes.Status201Created, new
        {
            restaurantId = restaurant.Id,
            averageRating = ratings.Average(item => (double)item.Score),
            ratingCount = ratings.Count
        });
    }

    private IQueryable<Restaurant> BuildApprovedRestaurantQuery() =>
        dbContext.Restaurants
            .AsNoTracking()
            .Where(restaurant => restaurant.IsApproved);

    private static IQueryable<Restaurant> ApplyFilters(IQueryable<Restaurant> query, RestaurantQueryParameters filters)
    {
        if (filters.CampusId is not null)
        {
            query = query.Where(restaurant => restaurant.CampusId == filters.CampusId);
        }

        if (!string.IsNullOrWhiteSpace(filters.Cuisine))
        {
            var cuisine = filters.Cuisine.Trim().ToLowerInvariant();
            query = query.Where(restaurant => restaurant.Cuisine.ToLower() == cuisine);
        }

        if (!string.IsNullOrWhiteSpace(filters.Budget))
        {
            var budget = filters.Budget.Trim();
            query = query.Where(restaurant => restaurant.Budget == budget);
        }

        if (!string.IsNullOrWhiteSpace(filters.Mood))
        {
            var mood = filters.Mood.Trim().ToLowerInvariant();
            query = query.Where(restaurant => restaurant.Mood.ToLower() == mood);
        }

        if (filters.MaxDistanceKm is not null)
        {
            query = query.Where(restaurant => restaurant.DistanceFromCampusKm <= filters.MaxDistanceKm);
        }

        if (!string.IsNullOrWhiteSpace(filters.Search))
        {
            var search = filters.Search.Trim().ToLowerInvariant();
            query = query.Where(restaurant =>
                restaurant.Name.ToLower().Contains(search) ||
                restaurant.Description.ToLower().Contains(search) ||
                restaurant.Address.ToLower().Contains(search));
        }

        return query;
    }

    private static Expression<Func<Restaurant, RestaurantSummaryDto>> MapToSummary() =>
        restaurant => new RestaurantSummaryDto(
            restaurant.Id,
            restaurant.Name,
            restaurant.Address,
            restaurant.Cuisine,
            restaurant.Budget,
            restaurant.Mood,
            restaurant.Description,
            restaurant.WebsiteUrl,
            restaurant.PhotoUrl,
            restaurant.DistanceFromCampusKm,
            restaurant.Latitude,
            restaurant.Longitude,
            restaurant.Ratings.Average(rating => (double?)rating.Score),
            restaurant.Ratings.Count,
            new CampusDto(
                restaurant.Campus!.Id,
                restaurant.Campus.Name,
                restaurant.Campus.University,
                restaurant.Campus.Suburb,
                restaurant.Campus.Latitude,
                restaurant.Campus.Longitude,
                restaurant.Campus.Restaurants.Count(item => item.IsApproved)));
}
