using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Microsoft.OpenApi.Models;
using Microsoft.Data.Sqlite;
using UniBite.Api.Configuration;
using UniBite.Api.Data;
using UniBite.Api.Services;
using System.Security.Cryptography;
using System.Text;

var builder = WebApplication.CreateBuilder(args);
var sqliteConnectionString = ResolveSqliteConnectionString(builder);
var swaggerEnabled = builder.Configuration.GetValue<bool?>("Swagger:Enabled")
    ?? builder.Environment.IsDevelopment();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "UniBite API",
        Version = "v1",
        Description = "Campus food discovery API for Brisbane university students."
    });
});

builder.Services.AddDbContext<UniBiteDbContext>(options =>
    options.UseSqlite(sqliteConnectionString));

builder.Services.Configure<OverpassOptions>(
    builder.Configuration.GetSection(OverpassOptions.SectionName));
builder.Services.Configure<GooglePlacesOptions>(
    builder.Configuration.GetSection(GooglePlacesOptions.SectionName));
builder.Services.Configure<AdminSecurityOptions>(
    builder.Configuration.GetSection(AdminSecurityOptions.SectionName));
builder.Services.AddScoped<RestaurantDataQualityService>();

builder.Services.AddHttpClient<OverpassRestaurantImportService>((serviceProvider, client) =>
{
    var overpassOptions = serviceProvider
        .GetRequiredService<Microsoft.Extensions.Options.IOptions<OverpassOptions>>()
        .Value;

    client.BaseAddress = new Uri(overpassOptions.EndpointUrl);
    client.Timeout = TimeSpan.FromSeconds(overpassOptions.RequestTimeoutSeconds);
    client.DefaultRequestHeaders.UserAgent.ParseAdd("UniBite/1.0 (+https://localhost)");
});

builder.Services.AddHttpClient<GooglePlacesPreviewService>((serviceProvider, client) =>
{
    var googlePlacesOptions = serviceProvider
        .GetRequiredService<Microsoft.Extensions.Options.IOptions<GooglePlacesOptions>>()
        .Value;

    client.Timeout = TimeSpan.FromSeconds(googlePlacesOptions.RequestTimeoutSeconds);
    client.DefaultRequestHeaders.UserAgent.ParseAdd("UniBite/1.0 (+https://localhost)");
});

var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? ["http://localhost:5173"];

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        var configuredOrigins = new HashSet<string>(allowedOrigins, StringComparer.OrdinalIgnoreCase);

        policy
            .SetIsOriginAllowed(origin =>
            {
                if (configuredOrigins.Contains(origin))
                {
                    return true;
                }

                if (!builder.Environment.IsDevelopment() ||
                    !Uri.TryCreate(origin, UriKind.Absolute, out var uri))
                {
                    return false;
                }

                return uri.IsLoopback;
            })
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

var webRootPath = app.Environment.WebRootPath ?? Path.Combine(app.Environment.ContentRootPath, "wwwroot");
var frontendIndexPath = Path.Combine(webRootPath, "index.html");
var hasBuiltFrontend = File.Exists(frontendIndexPath);

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<UniBiteDbContext>();
    var dataQualityService = scope.ServiceProvider.GetRequiredService<RestaurantDataQualityService>();
    await dbContext.Database.EnsureCreatedAsync();
    await DatabaseSchemaUpdater.EnsureLatestSchemaAsync(dbContext);
    await SeedData.InitializeAsync(dbContext);
    await dataQualityService.NormalizeAsync();
}

if (swaggerEnabled)
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("Frontend");
if (hasBuiltFrontend)
{
    app.UseDefaultFiles();
    app.UseStaticFiles();
}

app.Use(async (context, next) =>
{
    if (!context.Request.Path.StartsWithSegments("/api/admin"))
    {
        await next();
        return;
    }

    var adminSecurity = context.RequestServices
        .GetRequiredService<Microsoft.Extensions.Options.IOptions<AdminSecurityOptions>>()
        .Value;

    if (string.IsNullOrWhiteSpace(adminSecurity.ApiKey))
    {
        context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
        await context.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Title = "Admin access is not configured.",
            Detail = "Set AdminSecurity:ApiKey before using admin endpoints."
        });
        return;
    }

    if (!context.Request.Headers.TryGetValue(adminSecurity.HeaderName, out var suppliedHeader))
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        await context.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Title = "Admin key required.",
            Detail = $"Provide the {adminSecurity.HeaderName} header to access admin endpoints."
        });
        return;
    }

    if (!KeysMatch(adminSecurity.ApiKey, suppliedHeader.ToString()))
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        await context.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Title = "Admin key invalid.",
            Detail = "The supplied admin key did not match the configured admin key."
        });
        return;
    }

    await next();
});
app.UseAuthorization();
app.MapGet("/health", () => Results.Ok(new
{
    status = "ok",
    timestampUtc = DateTime.UtcNow
}));
app.MapControllers();

if (hasBuiltFrontend)
{
    app.MapFallbackToFile("index.html");
}

app.Run();

static bool KeysMatch(string expected, string actual)
{
    var expectedBytes = Encoding.UTF8.GetBytes(expected);
    var actualBytes = Encoding.UTF8.GetBytes(actual);

    return expectedBytes.Length == actualBytes.Length &&
           CryptographicOperations.FixedTimeEquals(expectedBytes, actualBytes);
}

static string ResolveSqliteConnectionString(WebApplicationBuilder builder)
{
    var configuredConnectionString = builder.Configuration.GetConnectionString("DefaultConnection")
        ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection is required.");

    var sqliteBuilder = new SqliteConnectionStringBuilder(configuredConnectionString);
    var explicitDbPath = Environment.GetEnvironmentVariable("UNIBITE_DB_PATH");

    if (!string.IsNullOrWhiteSpace(explicitDbPath))
    {
        sqliteBuilder.DataSource = explicitDbPath.Trim();
    }
    else
    {
        var configuredDataSource = sqliteBuilder.DataSource;
        var dataDirectoryOverride = Environment.GetEnvironmentVariable("UNIBITE_DATA_DIR");

        if (!Path.IsPathRooted(configuredDataSource))
        {
            sqliteBuilder.DataSource = !string.IsNullOrWhiteSpace(dataDirectoryOverride)
                ? Path.Combine(dataDirectoryOverride.Trim(), Path.GetFileName(configuredDataSource))
                : Path.GetFullPath(Path.Combine(builder.Environment.ContentRootPath, configuredDataSource));
        }
    }

    var databaseDirectory = Path.GetDirectoryName(sqliteBuilder.DataSource);
    if (!string.IsNullOrWhiteSpace(databaseDirectory))
    {
        Directory.CreateDirectory(databaseDirectory);
    }

    return sqliteBuilder.ToString();
}
