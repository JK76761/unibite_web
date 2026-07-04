export type Campus = {
  id: number;
  name: string;
  university: string;
  suburb: string;
  latitude: number;
  longitude: number;
  approvedRestaurantCount: number;
};

export type RestaurantSummary = {
  id: number;
  name: string;
  address: string;
  cuisine: string;
  budget: string;
  mood: string;
  description: string;
  websiteUrl: string | null;
  photoUrl: string | null;
  distanceFromCampusKm: number;
  latitude: number;
  longitude: number;
  averageRating: number | null;
  ratingCount: number;
  campus: Campus;
};

export type Rating = {
  id: number;
  reviewerName: string;
  score: number;
  comment: string | null;
  createdAtUtc: string;
};

export type RestaurantDetail = RestaurantSummary & {
  isApproved: boolean;
  createdAtUtc: string;
  ratings: Rating[];
};

export type RestaurantFilters = {
  campusId?: number;
  cuisine?: string;
  budget?: string;
  mood?: string;
  maxDistanceKm?: number;
  search?: string;
};

export type CreateRestaurantInput = {
  campusId: number;
  name: string;
  address: string;
  cuisine: string;
  budget: string;
  mood: string;
  description: string;
  distanceFromCampusKm: number;
  websiteUrl?: string;
};

export type CreateRatingInput = {
  reviewerName: string;
  score: number;
  comment?: string;
};

export type ImportedRestaurantPreview = {
  name: string;
  address: string;
  cuisine: string;
  distanceFromCampusKm: number;
  status: string;
};

export type OverpassCampusImportResult = {
  campusId: number;
  campusName: string;
  radiusMeters: number;
  dryRun: boolean;
  discoveredCount: number;
  insertedCount: number;
  updatedCount: number;
  duplicateCount: number;
  restaurants: ImportedRestaurantPreview[];
};

export type ApproveImportedRestaurantsResult = {
  campusId: number;
  campusName: string;
  source: string;
  approvedCount: number;
  restaurants: Array<{
    id: number;
    name: string;
    distanceFromCampusKm: number;
  }>;
};

export type PendingImportedRestaurant = {
  id: number;
  name: string;
  address: string;
  cuisine: string;
  budget: string;
  mood: string;
  description: string;
  websiteUrl: string | null;
  photoUrl: string | null;
  distanceFromCampusKm: number;
  latitude: number;
  longitude: number;
  externalSource: string | null;
  externalPlaceId: string | null;
  lastSyncedAtUtc: string | null;
  reviewStatus: "ready" | "caution" | "needs_review" | "reject";
  reviewScore: number;
  recommendedAction: string;
  flags: string[];
  reviewNotes: string[];
  duplicateHint: {
    restaurantId: number;
    name: string;
    isApproved: boolean;
    distanceKm: number;
    matchReason: string;
  } | null;
};

export type PendingImportedRestaurantsResult = {
  campusId: number;
  campusName: string;
  source: string;
  restaurantCount: number;
  readyCount: number;
  cautionCount: number;
  needsReviewCount: number;
  rejectCount: number;
  restaurants: PendingImportedRestaurant[];
};

export type ApproveSelectedImportedRestaurantsResult = {
  requestedCount: number;
  approvedCount: number;
  restaurants: Array<{
    id: number;
    name: string;
    distanceFromCampusKm: number;
  }>;
};

export type RejectImportedRestaurantsResult = {
  requestedCount: number;
  deletedCount: number;
  restaurants: Array<{
    id: number;
    name: string;
  }>;
};

export type NormalizeRestaurantDataResult = {
  campusId: number | null;
  campusName: string;
  scannedCount: number;
  updatedCount: number;
  namesNormalizedCount: number;
  classificationsUpdatedCount: number;
  descriptionsRefreshedCount: number;
  websitesClearedCount: number;
};

export type GooglePlacesPreview = {
  restaurantId: number;
  isConfigured: boolean;
  matched: boolean;
  message: string;
  placeId: string | null;
  matchedName: string | null;
  formattedAddress: string | null;
  websiteUrl: string | null;
  googleMapsUri: string | null;
  photoUrl: string | null;
  photoAttribution: string | null;
  distanceMeters: number | null;
};
