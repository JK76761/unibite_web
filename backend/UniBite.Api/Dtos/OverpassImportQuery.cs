using System.ComponentModel.DataAnnotations;

namespace UniBite.Api.Dtos;

public sealed class OverpassImportQuery
{
    [Range(250, 5000)]
    public int? RadiusMeters { get; set; }

    public bool DryRun { get; set; }
}
