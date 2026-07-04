using System.ComponentModel.DataAnnotations;

namespace UniBite.Api.Dtos;

public sealed class CreateRestaurantRequest
{
    [Required]
    public int CampusId { get; set; }

    [Required]
    [StringLength(160)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [StringLength(220)]
    public string Address { get; set; } = string.Empty;

    [Required]
    [StringLength(160)]
    public string Cuisine { get; set; } = string.Empty;

    [Required]
    [StringLength(24)]
    public string Budget { get; set; } = string.Empty;

    [Required]
    [StringLength(80)]
    public string Mood { get; set; } = string.Empty;

    [Required]
    [StringLength(600)]
    public string Description { get; set; } = string.Empty;

    [Range(0, 20)]
    public double DistanceFromCampusKm { get; set; }

    public double? Latitude { get; set; }

    public double? Longitude { get; set; }

    [StringLength(240)]
    public string? WebsiteUrl { get; set; }
}
