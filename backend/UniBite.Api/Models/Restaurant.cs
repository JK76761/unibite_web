using System.ComponentModel.DataAnnotations;

namespace UniBite.Api.Models;

public sealed class Restaurant
{
    public int Id { get; set; }

    public int CampusId { get; set; }

    public Campus? Campus { get; set; }

    [MaxLength(160)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(220)]
    public string Address { get; set; } = string.Empty;

    [MaxLength(160)]
    public string Cuisine { get; set; } = string.Empty;

    [MaxLength(24)]
    public string Budget { get; set; } = string.Empty;

    [MaxLength(80)]
    public string Mood { get; set; } = string.Empty;

    [MaxLength(600)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(240)]
    public string? WebsiteUrl { get; set; }

    [MaxLength(32)]
    public string? ExternalSource { get; set; }

    [MaxLength(120)]
    public string? ExternalPlaceId { get; set; }

    [MaxLength(400)]
    public string? PhotoUrl { get; set; }

    [MaxLength(240)]
    public string? PhotoAttribution { get; set; }

    public DateTime? LastSyncedAtUtc { get; set; }

    public double DistanceFromCampusKm { get; set; }

    public double Latitude { get; set; }

    public double Longitude { get; set; }

    public bool IsApproved { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public List<Rating> Ratings { get; set; } = [];
}
