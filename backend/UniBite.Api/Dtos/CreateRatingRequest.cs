using System.ComponentModel.DataAnnotations;

namespace UniBite.Api.Dtos;

public sealed class CreateRatingRequest
{
    [Required]
    [StringLength(80)]
    public string ReviewerName { get; set; } = string.Empty;

    [Range(1, 5)]
    public int Score { get; set; }

    [StringLength(500)]
    public string? Comment { get; set; }
}
