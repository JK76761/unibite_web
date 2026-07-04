using Microsoft.AspNetCore.Mvc;
using UniBite.Api.Dtos;
using UniBite.Api.Services;

namespace UniBite.Api.Controllers;

[ApiController]
[Route("api/admin/import")]
public sealed class AdminImportsController(OverpassRestaurantImportService overpassRestaurantImportService) : ControllerBase
{
    [HttpPost("campuses/{campusId:int}/overpass")]
    [ProducesResponseType(typeof(OverpassCampusImportResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status502BadGateway)]
    public async Task<ActionResult<OverpassCampusImportResultDto>> ImportCampusFromOverpass(
        int campusId,
        [FromQuery] OverpassImportQuery query,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await overpassRestaurantImportService.ImportCampusAsync(
                campusId,
                query.RadiusMeters,
                query.DryRun,
                cancellationToken);

            return Ok(result);
        }
        catch (InvalidOperationException exception) when (exception.Message.Contains("could not be found", StringComparison.OrdinalIgnoreCase))
        {
            return NotFound(new ProblemDetails
            {
                Title = "Campus not found",
                Detail = exception.Message
            });
        }
        catch (InvalidOperationException exception)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new ProblemDetails
            {
                Title = "Import failed",
                Detail = exception.Message
            });
        }
    }
}
