using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UniBite.Api.Data;
using UniBite.Api.Dtos;

namespace UniBite.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class CampusesController(UniBiteDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CampusDto>>> GetCampuses()
    {
        var campuses = await dbContext.Campuses
            .AsNoTracking()
            .OrderBy(campus => campus.Name)
            .Select(campus => new CampusDto(
                campus.Id,
                campus.Name,
                campus.University,
                campus.Suburb,
                campus.Latitude,
                campus.Longitude,
                campus.Restaurants.Count(restaurant => restaurant.IsApproved)))
            .ToListAsync();

        return Ok(campuses);
    }
}
