import type {
  ApproveSelectedImportedRestaurantsResult,
  ApproveImportedRestaurantsResult,
  Campus,
  CreateRatingInput,
  CreateRestaurantInput,
  GooglePlacesPreview,
  NormalizeRestaurantDataResult,
  OverpassCampusImportResult,
  PendingImportedRestaurantsResult,
  RejectImportedRestaurantsResult,
  RestaurantDetail,
  RestaurantFilters,
  RestaurantSummary,
} from "../types/api";
import {
  expireAdminSession,
  getStoredAdminKey,
  touchAdminSession,
} from "./adminSession";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.DEV ? "http://localhost:5250" : "")
).replace(/\/$/, "");

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const adminHeaders: Record<string, string> = {};
  const storedAdminKey = getStoredAdminKey();

  if (path.startsWith("/api/admin") && storedAdminKey) {
    adminHeaders["X-Admin-Key"] = storedAdminKey;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...adminHeaders,
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let message = errorText || "Request failed.";

    try {
      const errorJson = JSON.parse(errorText) as {
        title?: string;
        detail?: string;
        errors?: Record<string, string[]>;
      };

      const validationMessage = errorJson.errors
        ? Object.values(errorJson.errors).flat().join(" ")
        : "";

      message =
        validationMessage || errorJson.detail || errorJson.title || message;
    } catch {
      // Fall back to the raw text payload.
    }

    if (response.status === 401 && path.startsWith("/api/admin")) {
      expireAdminSession(message);
    }

    throw new Error(message);
  }

  if (path.startsWith("/api/admin") && storedAdminKey) {
    touchAdminSession();
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function buildQueryString(filters: RestaurantFilters) {
  const params = new URLSearchParams();

  if (filters.campusId) {
    params.set("campusId", String(filters.campusId));
  }

  if (filters.cuisine) {
    params.set("cuisine", filters.cuisine);
  }

  if (filters.budget) {
    params.set("budget", filters.budget);
  }

  if (filters.mood) {
    params.set("mood", filters.mood);
  }

  if (typeof filters.maxDistanceKm === "number") {
    params.set("maxDistanceKm", String(filters.maxDistanceKm));
  }

  if (filters.search) {
    params.set("search", filters.search);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

export function getCampuses() {
  return apiRequest<Campus[]>("/api/campuses");
}

export function getRestaurants(filters: RestaurantFilters) {
  return apiRequest<RestaurantSummary[]>(
    `/api/restaurants${buildQueryString(filters)}`,
  );
}

export function getRestaurant(id: number) {
  return apiRequest<RestaurantDetail>(`/api/restaurants/${id}`);
}

export function getRandomRecommendation(filters: RestaurantFilters) {
  return apiRequest<RestaurantSummary>(
    `/api/restaurants/recommendation/random${buildQueryString(filters)}`,
  );
}

export function createRestaurant(payload: CreateRestaurantInput) {
  return apiRequest<{ id: number; name: string; isApproved: boolean; message: string }>(
    "/api/restaurants",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function createRating(restaurantId: number, payload: CreateRatingInput) {
  return apiRequest<{ averageRating: number; ratingCount: number }>(
    `/api/restaurants/${restaurantId}/ratings`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function importCampusFromOverpass(args: {
  campusId: number;
  radiusMeters: number;
  dryRun: boolean;
}) {
  const params = new URLSearchParams({
    radiusMeters: String(args.radiusMeters),
    dryRun: String(args.dryRun),
  });

  return apiRequest<OverpassCampusImportResult>(
    `/api/admin/import/campuses/${args.campusId}/overpass?${params.toString()}`,
    {
      method: "POST",
    },
  );
}

export function approveImportedRestaurants(args: {
  campusId: number;
  source?: string;
  limit?: number;
}) {
  const params = new URLSearchParams();

  if (args.source) {
    params.set("source", args.source);
  }

  if (typeof args.limit === "number") {
    params.set("limit", String(args.limit));
  }

  return apiRequest<ApproveImportedRestaurantsResult>(
    `/api/admin/restaurants/campuses/${args.campusId}/approve-imported?${params.toString()}`,
    {
      method: "POST",
    },
  );
}

export function getPendingImportedRestaurants(args: {
  campusId: number;
  source?: string;
}) {
  const params = new URLSearchParams();

  if (args.source) {
    params.set("source", args.source);
  }

  return apiRequest<PendingImportedRestaurantsResult>(
    `/api/admin/restaurants/campuses/${args.campusId}/pending-imported?${params.toString()}`,
  );
}

export function approveSelectedImportedRestaurants(restaurantIds: number[]) {
  return apiRequest<ApproveSelectedImportedRestaurantsResult>(
    "/api/admin/restaurants/approve-selected",
    {
      method: "POST",
      body: JSON.stringify({ restaurantIds }),
    },
  );
}

export function rejectSelectedImportedRestaurants(restaurantIds: number[]) {
  return apiRequest<RejectImportedRestaurantsResult>(
    "/api/admin/restaurants/reject-selected",
    {
      method: "POST",
      body: JSON.stringify({ restaurantIds }),
    },
  );
}

export function normalizeCampusRestaurantData(campusId: number) {
  return apiRequest<NormalizeRestaurantDataResult>(
    `/api/admin/restaurants/campuses/${campusId}/normalize-data`,
    {
      method: "POST",
    },
  );
}

export function getGooglePlacesPreview(restaurantId: number) {
  return apiRequest<GooglePlacesPreview>(
    `/api/admin/restaurants/${restaurantId}/google-places-preview`,
  );
}

export function checkAdminAccess() {
  return apiRequest<{ isAdmin: boolean; message: string }>("/api/admin/access-check");
}
