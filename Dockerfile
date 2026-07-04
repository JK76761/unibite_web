FROM node:22-alpine AS frontend-build
WORKDIR /src/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./

ARG VITE_API_BASE_URL=
ARG VITE_GOOGLE_PLACES_API_KEY=

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_GOOGLE_PLACES_API_KEY=$VITE_GOOGLE_PLACES_API_KEY

RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS backend-build
WORKDIR /src

COPY UniBite.sln ./
COPY backend/UniBite.Api/UniBite.Api.csproj backend/UniBite.Api/
RUN dotnet restore backend/UniBite.Api/UniBite.Api.csproj

COPY backend/ backend/
RUN dotnet publish backend/UniBite.Api/UniBite.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
ENV UNIBITE_DATA_DIR=/var/data

COPY --from=backend-build /app/publish ./
COPY --from=frontend-build /src/frontend/dist ./wwwroot

RUN mkdir -p /var/data /app/Data

EXPOSE 8080

ENTRYPOINT ["dotnet", "UniBite.Api.dll"]
