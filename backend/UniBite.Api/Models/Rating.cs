using System.ComponentModel.DataAnnotations;

namespace UniBite.Api.Models;

public sealed class Rating
{
    public int Id { get; set; }

    public int RestaurantId { get; set; }

    public Restaurant? Restaurant { get; set; }

    [MaxLength(80)]
    public string ReviewerName { get; set; } = string.Empty;

    [Range(1, 5)]
    public int Score { get; set; }

    [MaxLength(500)]
    public string? Comment { get; set; }

    public DateTime CreatedAtUtc { get; set; }
}
