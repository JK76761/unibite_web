namespace UniBite.Api.Dtos;

public sealed record RatingDto(
    int Id,
    string ReviewerName,
    int Score,
    string? Comment,
    DateTime CreatedAtUtc);
