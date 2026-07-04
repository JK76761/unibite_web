using System.Data;
using System.Data.Common;
using Microsoft.EntityFrameworkCore;

namespace UniBite.Api.Data;

public static class DatabaseSchemaUpdater
{
    public static async Task EnsureLatestSchemaAsync(UniBiteDbContext dbContext, CancellationToken cancellationToken = default)
    {
        var connection = dbContext.Database.GetDbConnection();
        var shouldClose = connection.State != ConnectionState.Open;

        if (shouldClose)
        {
            await connection.OpenAsync(cancellationToken);
        }

        try
        {
            if (!await TableExistsAsync(connection, "Restaurants", cancellationToken))
            {
                return;
            }

            var restaurantColumns = await GetColumnNamesAsync(connection, "Restaurants", cancellationToken);

            await AddColumnIfMissingAsync(connection, restaurantColumns, "ExternalSource", "TEXT NULL", cancellationToken);
            await AddColumnIfMissingAsync(connection, restaurantColumns, "ExternalPlaceId", "TEXT NULL", cancellationToken);
            await AddColumnIfMissingAsync(connection, restaurantColumns, "PhotoUrl", "TEXT NULL", cancellationToken);
            await AddColumnIfMissingAsync(connection, restaurantColumns, "PhotoAttribution", "TEXT NULL", cancellationToken);
            await AddColumnIfMissingAsync(connection, restaurantColumns, "LastSyncedAtUtc", "TEXT NULL", cancellationToken);

            await ExecuteNonQueryAsync(
                connection,
                """
                CREATE UNIQUE INDEX IF NOT EXISTS IX_Restaurants_ExternalSource_ExternalPlaceId
                ON Restaurants (ExternalSource, ExternalPlaceId);
                """,
                cancellationToken);

            await ExecuteNonQueryAsync(
                connection,
                """
                CREATE INDEX IF NOT EXISTS IX_Restaurants_CampusId_Name
                ON Restaurants (CampusId, Name);
                """,
                cancellationToken);
        }
        finally
        {
            if (shouldClose)
            {
                await connection.CloseAsync();
            }
        }
    }

    private static async Task<bool> TableExistsAsync(DbConnection connection, string tableName, CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = $tableName LIMIT 1;";

        var parameter = command.CreateParameter();
        parameter.ParameterName = "$tableName";
        parameter.Value = tableName;
        command.Parameters.Add(parameter);

        return await command.ExecuteScalarAsync(cancellationToken) is not null;
    }

    private static async Task<HashSet<string>> GetColumnNamesAsync(DbConnection connection, string tableName, CancellationToken cancellationToken)
    {
        var columns = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        await using var command = connection.CreateCommand();
        command.CommandText = $"PRAGMA table_info({tableName});";

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            columns.Add(reader.GetString(1));
        }

        return columns;
    }

    private static async Task AddColumnIfMissingAsync(
        DbConnection connection,
        ISet<string> existingColumns,
        string columnName,
        string definition,
        CancellationToken cancellationToken)
    {
        if (!existingColumns.Add(columnName))
        {
            return;
        }

        await ExecuteNonQueryAsync(
            connection,
            $"ALTER TABLE Restaurants ADD COLUMN {columnName} {definition};",
            cancellationToken);
    }

    private static async Task ExecuteNonQueryAsync(DbConnection connection, string sql, CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        await command.ExecuteNonQueryAsync(cancellationToken);
    }
}
