using System.ComponentModel.DataAnnotations;

namespace UniBite.Api.Dtos;

public sealed class ApproveImportedRestaurantsQuery
{
    [StringLength(32)]
    public string Source { get; set; } = "overpass";

    [Range(1, 500)]
    public int? Limit { get; set; }
}
