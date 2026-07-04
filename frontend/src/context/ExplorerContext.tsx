import { useMutation, useQuery } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useSavedRestaurants } from "../hooks/useSavedRestaurants";
import { getCampuses, getRandomRecommendation, getRestaurants } from "../lib/api";
import {
  getRestaurantDistanceFromCoordinatesKm,
  type Coordinates,
} from "../lib/location";
import type { RestaurantFilters } from "../types/api";

const DEFAULT_CAMPUS_NAME = "QUT Gardens Point";

export type FilterState = {
  campusId: number | null;
  search: string;
  cuisine: string;
  budget: string;
  mood: string;
  maxDistanceKm: number | "";
};

type SortMode = "campus" | "me";

function useExplorerValue() {
  const campusesQuery = useQuery({
    queryKey: ["campuses"],
    queryFn: getCampuses,
  });

  const [filters, setFilters] = useState<FilterState>({
    campusId: null,
    search: "",
    cuisine: "",
    budget: "",
    mood: "",
    maxDistanceKm: "",
  });
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("campus");

  const { savedIds, isSaved, toggleSaved } = useSavedRestaurants();

  const defaultCampus =
    campusesQuery.data?.find((campus) => campus.name === DEFAULT_CAMPUS_NAME) ??
    campusesQuery.data?.[0] ??
    null;

  useEffect(() => {
    if (!defaultCampus || filters.campusId) {
      return;
    }

    setFilters((current) => ({
      ...current,
      campusId: defaultCampus.id,
    }));
  }, [defaultCampus?.id, filters.campusId]);

  const debouncedFilters = useDebouncedValue(filters, 350);
  const queryFilters: RestaurantFilters = {
    campusId: debouncedFilters.campusId ?? defaultCampus?.id ?? undefined,
    search: debouncedFilters.search || undefined,
    cuisine: debouncedFilters.cuisine || undefined,
    budget: debouncedFilters.budget || undefined,
    mood: debouncedFilters.mood || undefined,
    maxDistanceKm:
      debouncedFilters.maxDistanceKm === ""
        ? undefined
        : debouncedFilters.maxDistanceKm,
  };

  const restaurantsQuery = useQuery({
    queryKey: ["restaurants", queryFilters],
    queryFn: () => getRestaurants(queryFilters),
    enabled: Boolean(queryFilters.campusId),
  });

  const recommendation = useMutation({
    mutationFn: () => getRandomRecommendation(queryFilters),
    onSuccess: (restaurant) => {
      setSelectedRestaurantId(restaurant.id);
    },
  });

  useEffect(() => {
    recommendation.reset();
  }, [
    debouncedFilters.budget,
    debouncedFilters.campusId,
    debouncedFilters.cuisine,
    debouncedFilters.maxDistanceKm,
    debouncedFilters.mood,
    debouncedFilters.search,
  ]);

  const selectedCampus =
    campusesQuery.data?.find((campus) => campus.id === filters.campusId) ??
    defaultCampus;

  const restaurants = restaurantsQuery.data ?? [];

  const getRestaurantDistanceKm = (restaurant: (typeof restaurants)[number]) => {
    if (sortMode === "me" && userLocation) {
      return getRestaurantDistanceFromCoordinatesKm(restaurant, userLocation);
    }

    return restaurant.distanceFromCampusKm;
  };

  const displayRestaurants =
    sortMode === "me" && userLocation
      ? [...restaurants].sort(
          (left, right) =>
            getRestaurantDistanceKm(left) - getRestaurantDistanceKm(right),
        )
      : restaurants;

  const orderedRestaurantIdsKey = displayRestaurants.map((restaurant) => restaurant.id).join("-");

  useEffect(() => {
    if (displayRestaurants.length === 0) {
      setSelectedRestaurantId(null);
      return;
    }

    const currentExists = selectedRestaurantId
      ? displayRestaurants.some((restaurant) => restaurant.id === selectedRestaurantId)
      : false;

    if (currentExists) {
      return;
    }

    const recommendedRestaurant = recommendation.data
      ? displayRestaurants.find((restaurant) => restaurant.id === recommendation.data?.id)
      : null;

    setSelectedRestaurantId(recommendedRestaurant?.id ?? displayRestaurants[0].id);
  }, [displayRestaurants, orderedRestaurantIdsKey, recommendation.data, selectedRestaurantId]);

  const selectedRestaurant =
    displayRestaurants.find((restaurant) => restaurant.id === selectedRestaurantId) ??
    restaurants.find((restaurant) => restaurant.id === selectedRestaurantId) ??
    null;

  const savedRestaurants = displayRestaurants.filter((restaurant) =>
    savedIds.includes(restaurant.id),
  );

  const requestUserLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocationError("This browser does not support device location.");
      return;
    }

    setIsLocating(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setSortMode("me");
        setIsLocating(false);
      },
      (error) => {
        setLocationError(error.message || "Unable to access your location.");
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000 * 60 * 5,
        timeout: 10000,
      },
    );
  };

  return {
    campuses: campusesQuery.data ?? [],
    campusesQuery,
    clearFilters: () =>
      setFilters((current) => ({
        ...current,
        search: "",
        cuisine: "",
        budget: "",
        mood: "",
        maxDistanceKm: "",
      })),
    defaultCampus,
    displayRestaurants,
    filters,
    getRestaurantDistanceKm,
    hasCampusSelection: Boolean(queryFilters.campusId),
    isLocating,
    isSaved,
    locationError,
    queryFilters,
    recommendation,
    requestUserLocation,
    restaurants,
    restaurantsQuery,
    savedIds,
    savedRestaurants,
    selectedCampus,
    selectedRestaurant,
    selectedRestaurantId,
    setCampusId: (campusId: number) =>
      setFilters((current) => ({
        ...current,
        campusId,
      })),
    setFilter: (field: keyof FilterState, value: FilterState[keyof FilterState]) =>
      setFilters((current) => ({
        ...current,
        [field]: value,
      })),
    setSelectedRestaurantId,
    setSortMode,
    sortMode,
    toggleSaved,
    userLocation,
  };
}

type ExplorerContextValue = ReturnType<typeof useExplorerValue>;

const ExplorerContext = createContext<ExplorerContextValue | null>(null);

export function ExplorerProvider({ children }: PropsWithChildren) {
  const value = useExplorerValue();

  return (
    <ExplorerContext.Provider value={value}>{children}</ExplorerContext.Provider>
  );
}

export function useExplorer() {
  const context = useContext(ExplorerContext);

  if (!context) {
    throw new Error("useExplorer must be used within ExplorerProvider.");
  }

  return context;
}
