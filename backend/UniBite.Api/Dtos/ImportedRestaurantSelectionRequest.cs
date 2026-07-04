using System.ComponentModel.DataAnnotations;

namespace UniBite.Api.Dtos;

public sealed class ImportedRestaurantSelectionRequest
{
    [Required]
    [MinLength(1)]
    public List<int> RestaurantIds { get; set; } = [];
}
