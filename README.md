# UniBite

UniBite is a lightweight campus food finder for university students in Brisbane. Students can pick a campus, browse nearby food options, filter by budget, cuisine, mood, and distance, view results on a map, get a random recommendation, submit new restaurant suggestions, and leave ratings.

## Tech stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, TanStack Query, React Router, React Leaflet
- Backend: ASP.NET Core Web API, C#, Entity Framework Core, SQLite
- API docs: Swagger / OpenAPI
- Map: OpenStreetMap tiles via Leaflet, with no paid API required by default

## Project structure

```text
.
├── backend/
│   └── UniBite.Api/
├── frontend/
├── UniBite.sln
└── README.md
```

## Features

- Campus selector with seeded Brisbane university campuses
- Restaurant discovery cards with filterable results
- Debounced filters for campus, search, cuisine, budget, mood, and distance
- Free map view powered by OpenStreetMap and Leaflet
- Random "Pick for me" recommendation flow
- Restaurant detail page with ratings and comments
- Student restaurant suggestion form that defaults submissions to `IsApproved = false`
- Public API hides unapproved restaurants from the main list
- Swagger UI for exploring and testing the backend
- Overpass-powered campus import endpoint for expanding the restaurant dataset without editing seed data by hand
- Single-container production deployment path with Docker, health checks, SPA fallback routing, and persistent SQLite storage support

## Seeded data

- 5 Brisbane campuses:
  - QUT Gardens Point
  - QUT Kelvin Grove
  - UQ St Lucia
  - Griffith South Bank
  - Griffith Nathan
- 30 approved sample restaurants across those campuses
- Seeded ratings so average score and review counts appear immediately

## Setup

### 1. Backend

```bash
dotnet restore UniBite.sln
dotnet run --project backend/UniBite.Api/UniBite.Api.csproj
```

The API runs at `http://localhost:5250` and Swagger is available at:

```text
http://localhost:5250/swagger
```

SQLite is created automatically on startup inside `backend/UniBite.Api/Data/`.

Admin endpoints are protected by `X-Admin-Key`. For local development, the
default key in [`backend/UniBite.Api/appsettings.Development.json`](/Users/josh/UniBite/backend/UniBite.Api/appsettings.Development.json)
is `0002`.

Change it before deploying anywhere public, or override it with an environment
variable:

```bash
export AdminSecurity__ApiKey=your-own-secret-key
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`.

### 3. Optional frontend environment variables

Create `frontend/.env.local` if you want to override the defaults:

```bash
VITE_API_BASE_URL=http://localhost:5250
VITE_GOOGLE_PLACES_API_KEY=
```

`VITE_GOOGLE_PLACES_API_KEY` is intentionally optional and not used automatically. The app uses seeded data and OpenStreetMap first.

`VITE_API_BASE_URL` is only needed for split local development. In production, UniBite now defaults to same-origin API requests, so the frontend can be served directly by the ASP.NET app.

## Production hosting

UniBite is now set up to run as a single deployable service:

- ASP.NET Core serves both the API and the built React frontend
- React routes fall back to `index.html` so direct links like `/discover` and `/restaurants/12` work in production
- SQLite can be moved onto a persistent disk with `UNIBITE_DATA_DIR` or `UNIBITE_DB_PATH`
- A health endpoint is available at `GET /health`
- Swagger defaults to enabled in development and disabled in production unless you override `Swagger__Enabled=true`

### Local production-style test with Docker

Build the container:

```bash
docker build -t unibite .
```

Run it with a local persistent folder:

```bash
mkdir -p .deploy-data
docker run \
  -p 8080:8080 \
  -e AdminSecurity__ApiKey=change-me \
  -e Swagger__Enabled=false \
  -v "$(pwd)/.deploy-data:/var/data" \
  unibite
```

Then open:

```text
http://localhost:8080
```

Health check:

```text
http://localhost:8080/health
```

### Recommended first hosting target: Render

This repo includes:

- `Dockerfile`
- `.dockerignore`
- `render.yaml`
- `docs/render-deploy.md`

The current recommended path for this SQLite-based MVP is a single Render web service with a persistent disk. The included `render.yaml` mounts a disk at `/var/data`, and the app automatically stores the SQLite database there through `UNIBITE_DATA_DIR=/var/data`.

Typical deployment flow:

1. Push this repo to GitHub.
2. In Render, create a new Blueprint or Web Service from the repo.
3. Keep the persistent disk enabled at `/var/data`.
4. Set a strong `AdminSecurity__ApiKey`.
5. Optionally set `GooglePlaces__ApiKey` only if you want the preview helper.
6. Deploy and verify `/health` and the public homepage.

For the step-by-step version, use [`docs/render-deploy.md`](/Users/josh/UniBite/docs/render-deploy.md).

Important SQLite note:

- This setup is good for an MVP or portfolio deployment.
- Keep UniBite on a single app instance when using SQLite.
- If you later need multiple replicas, zero-downtime releases across regions, or heavier write traffic, move from SQLite to PostgreSQL.

## API endpoints

### Campuses

- `GET /api/campuses`

### Restaurants

- `GET /api/restaurants`
- `GET /api/restaurants/{id}`
- `GET /api/restaurants/recommendation/random`
- `POST /api/restaurants`
- `POST /api/restaurants/{id}/ratings`

### Admin import

- `POST /api/admin/import/campuses/{campusId}/overpass`
- `GET /api/admin/access-check`
- `GET /api/admin/restaurants/campuses/{campusId}/pending-imported`
- `POST /api/admin/restaurants/campuses/{campusId}/approve-imported`
- `POST /api/admin/restaurants/approve-selected`
- `POST /api/admin/restaurants/reject-selected`
- `POST /api/admin/restaurants/campuses/{campusId}/normalize-data`
- `GET /api/admin/restaurants/{restaurantId}/google-places-preview`

Query parameters:

- `radiusMeters` optional, from `250` to `5000`
- `dryRun` optional, `true` to preview without saving

Example preview import:

```text
/api/admin/import/campuses/1/overpass?dryRun=true&radiusMeters=1200
```

Example approval after import:

```text
/api/admin/restaurants/campuses/1/approve-imported?source=overpass&limit=50
```

### Restaurant query filters

`GET /api/restaurants` and `GET /api/restaurants/recommendation/random` support:

- `campusId`
- `cuisine`
- `budget`
- `mood`
- `maxDistanceKm`
- `search`

Example:

```text
/api/restaurants?campusId=1&cuisine=Japanese&maxDistanceKm=0.5
```

## Notes

- New restaurant submissions are stored with `IsApproved = false`.
- Overpass imports are also stored with `IsApproved = false`, so imported places can be reviewed before going public.
- To show imported places on the public map, approve them after import with the admin approval endpoint.
- Admin endpoints require the `X-Admin-Key` header and are also locked behind an admin unlock form in the frontend review tab.
- Only approved restaurants appear in the public list endpoint.
- Average rating and rating count are calculated from the related `Rating` records.
- TanStack Query is configured with `staleTime`, `gcTime`, `retry: 1`, `refetchOnWindowFocus: false`, and `enabled` query conditions.
- Overpass configuration lives in `backend/UniBite.Api/appsettings.json` under the `Overpass` section.
- Google Places preview is optional and read-only by default. This is intentional because Google photo names and photo URIs are short-lived and subject to caching restrictions, so the app previews them on demand instead of storing them long-term.
- Production deploys can use `UNIBITE_DATA_DIR=/var/data` or `UNIBITE_DB_PATH=/absolute/path/to/unibite.db` to keep SQLite on persistent storage.

## Portfolio bullets

- Built a full-stack campus food discovery app using React, TypeScript, ASP.NET Core, EF Core, and SQLite.
- Implemented seeded geospatial-style restaurant discovery with map visualization, query filtering, and random recommendation flows.
- Designed a moderation-friendly submission workflow where student restaurant suggestions are stored as unapproved until reviewed.
- Added end-to-end UX states, cached API querying with TanStack Query, and interactive Swagger documentation for rapid testing.
