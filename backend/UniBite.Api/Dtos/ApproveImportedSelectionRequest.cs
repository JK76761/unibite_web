using System.ComponentModel.DataAnnotations;

namespace UniBite.Api.Dtos;

public sealed class ApproveImportedSelectionRequest
{
    [Required]
    [MinLength(1)]
    public List<int> RestaurantIds { get; set; } = [];
}
