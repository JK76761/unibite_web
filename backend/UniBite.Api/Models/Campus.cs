using System.ComponentModel.DataAnnotations;

namespace UniBite.Api.Models;

public sealed class Campus
{
    public int Id { get; set; }

    [MaxLength(120)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(120)]
    public string University { get; set; } = string.Empty;

    [MaxLength(80)]
    public string Suburb { get; set; } = string.Empty;

    public double Latitude { get; set; }

    public double Longitude { get; set; }

    public List<Restaurant> Restaurants { get; set; } = [];
}
