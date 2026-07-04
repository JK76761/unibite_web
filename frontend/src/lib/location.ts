import type { RestaurantSummary } from "../types/api";

export type Coordinates = {
  latitude: number;
  longitude: number;
};

const earthRadiusKm = 6371;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function getDistanceBetweenCoordinatesKm(
  origin: Coordinates,
  destination: Coordinates,
) {
  const latitudeDelta = toRadians(destination.latitude - origin.latitude);
  const longitudeDelta = toRadians(destination.longitude - origin.longitude);
  const originLatitude = toRadians(origin.latitude);
  const destinationLatitude = toRadians(destination.latitude);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(haversine));
}

export function getRestaurantDistanceFromCoordinatesKm(
  restaurant: RestaurantSummary,
  coordinates: Coordinates,
) {
  return getDistanceBetweenCoordinatesKm(coordinates, {
    latitude: restaurant.latitude,
    longitude: restaurant.longitude,
  });
}
