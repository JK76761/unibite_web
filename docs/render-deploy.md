# UniBite Render Deploy Guide

This guide assumes you want the simplest production path for the current UniBite stack:

- React frontend
- ASP.NET Core backend
- SQLite on a persistent disk
- single-instance deployment

## 1. Local preflight

From the repo root:

```bash
dotnet build backend/UniBite.Api
cd frontend && npm run build && cd ..
```

Optional Docker smoke test:

```bash
docker build -t unibite .
mkdir -p .deploy-data
docker run \
  -p 8080:8080 \
  -e AdminSecurity__ApiKey=change-me-now \
  -e Swagger__Enabled=false \
  -v "$(pwd)/.deploy-data:/var/data" \
  unibite
```

Then open:

```text
http://localhost:8080
http://localhost:8080/health
```

## 2. Create the Git repository

If the project is not already a Git repo:

```bash
git init -b main
git add .
git commit -m "Prepare UniBite for production deployment"
```

## 3. Push to GitHub

Create an empty GitHub repo first, then connect it:

```bash
git remote add origin https://github.com/YOUR_USERNAME/unibite.git
git push -u origin main
```

If you use SSH:

```bash
git remote add origin git@github.com:YOUR_USERNAME/unibite.git
git push -u origin main
```

## 4. Deploy on Render

This repo includes `render.yaml`, so the easiest option is:

1. Open Render.
2. Choose `New +`.
3. Select `Blueprint`.
4. Connect the GitHub repo.
5. Confirm the detected `render.yaml`.

Render will create:

- one Docker web service
- one persistent disk mounted at `/var/data`

## 5. Required environment variables

Set these in Render before the first public deploy:

- `AdminSecurity__ApiKey`
  Use a strong secret. Do not keep the local dev value.
- `Swagger__Enabled`
  Keep this `false` unless you intentionally want public API docs.

Optional:

- `GooglePlaces__ApiKey`
  Only needed if you want Google photo preview tools.

Already configured by `render.yaml`:

- `ASPNETCORE_ENVIRONMENT=Production`
- `UNIBITE_DATA_DIR=/var/data`

## 6. First deploy checks

After Render finishes deploying:

1. Open the service root URL.
2. Confirm the mobile web app loads.
3. Open `/health` and confirm it returns `200 OK`.
4. Test campus loading and restaurant list loading.
5. Submit a sample restaurant suggestion.
6. Unlock the admin review tab with your production admin key.
7. Run a small Overpass preview import and confirm the queue loads.

## 7. Custom domain

If you want a real public URL:

1. Open the Render service.
2. Go to `Settings`.
3. Add your custom domain.
4. Update your DNS records as Render instructs.

Render will handle HTTPS certificates automatically once DNS is correct.

## 8. Operational notes

- This deployment is suitable for MVP, demo, and portfolio use.
- Keep the service on a single instance while using SQLite.
- If UniBite grows into a multi-user production app with heavier traffic, migrate from SQLite to PostgreSQL.
- Keep a backup habit for the SQLite file stored on the Render disk.

## 9. Safe release flow

For future updates:

```bash
git add .
git commit -m "Describe the release"
git push
```

Render will redeploy automatically from GitHub.
