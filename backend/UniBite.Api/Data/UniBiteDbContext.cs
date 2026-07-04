using Microsoft.EntityFrameworkCore;
using UniBite.Api.Models;

namespace UniBite.Api.Data;

public sealed class UniBiteDbContext(DbContextOptions<UniBiteDbContext> options) : DbContext(options)
{
    public DbSet<Campus> Campuses => Set<Campus>();

    public DbSet<Restaurant> Restaurants => Set<Restaurant>();

    public DbSet<Rating> Ratings => Set<Rating>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Campus>()
            .HasIndex(c => c.Name)
            .IsUnique();

        modelBuilder.Entity<Restaurant>()
            .HasIndex(r => new { r.CampusId, r.IsApproved, r.Cuisine, r.Budget, r.Mood });

        modelBuilder.Entity<Restaurant>()
            .HasIndex(r => new { r.ExternalSource, r.ExternalPlaceId })
            .IsUnique();

        modelBuilder.Entity<Restaurant>()
            .HasOne(r => r.Campus)
            .WithMany(c => c.Restaurants)
            .HasForeignKey(r => r.CampusId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Rating>()
            .HasOne(r => r.Restaurant)
            .WithMany(r => r.Ratings)
            .HasForeignKey(r => r.RestaurantId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
