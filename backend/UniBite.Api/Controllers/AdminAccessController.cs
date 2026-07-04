using Microsoft.AspNetCore.Mvc;

namespace UniBite.Api.Controllers;

[ApiController]
[Route("api/admin")]
public sealed class AdminAccessController : ControllerBase
{
    [HttpGet("access-check")]
    public IActionResult CheckAccess() =>
        Ok(new
        {
            isAdmin = true,
            message = "Admin access granted."
        });
}
