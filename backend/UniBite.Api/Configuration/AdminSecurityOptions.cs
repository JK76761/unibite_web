namespace UniBite.Api.Configuration;

public sealed class AdminSecurityOptions
{
    public const string SectionName = "AdminSecurity";

    public string ApiKey { get; set; } = string.Empty;

    public string HeaderName { get; set; } = "X-Admin-Key";
}
