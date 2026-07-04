import L from "leaflet";
import { useEffect } from "react";
import { CircleMarker, MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { useMap } from "react-leaflet";
import type { Coordinates } from "../lib/location";
import type { Campus, RestaurantSummary } from "../types/api";
import { MapPinIcon, WalkIcon } from "./Icons";

const defaultCenter: [number, number] = [-27.4698, 153.0251];

function createPinIcon(backgroundColor: string, size: "dense" | "sm" | "lg") {
  const iconSize = size === "lg" ? 48 : size === "dense" ? 28 : 36;
  const glyphSize = size === "lg" ? 18 : size === "dense" ? 11 : 14;

  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:${iconSize}px;height:${iconSize}px;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;inset:0;border-radius:9999px 9999px 9999px 0;background:${backgroundColor};transform:rotate(-45deg);box-shadow:0 10px 20px rgba(15,23,42,0.16);border:3px solid white;"></div>
      <div style="position:relative;z-index:1;transform:translateY(-5px) rotate(45deg);color:white;font-size:${glyphSize}px;font-weight:800;">| |</div>
    </div>`,
    iconSize: [iconSize, iconSize],
    iconAnchor: [iconSize / 2, iconSize - 2],
  });
}

const denseRegularPinIcon = createPinIcon("#F58B1E", "dense");
const regularPinIcon = createPinIcon("#F58B1E", "sm");
const selectedPinIcon = createPinIcon("#168A2B", "lg");

type MapPanelProps = {
  centerOverride?: [number, number];
  campus: Campus | null;
  heightClassName?: string;
  onSelectRestaurant?: (restaurantId: number) => void;
  restaurants: RestaurantSummary[];
  selectedRestaurantId?: number | null;
  showSelectedSummary?: boolean;
  userLocation?: Coordinates | null;
};

export function MapPanel({
  centerOverride,
  campus,
  restaurants,
  selectedRestaurantId,
  onSelectRestaurant,
  heightClassName = "h-[292px] min-h-[292px] max-h-[320px] md:h-[380px] xl:h-[480px]",
  showSelectedSummary = false,
  userLocation,
}: MapPanelProps) {
  const selectedRestaurant =
    restaurants.find((restaurant) => restaurant.id === selectedRestaurantId) ??
    restaurants[0] ??
    null;

  const center: [number, number] = centerOverride ??
    (campus
      ? [campus.latitude, campus.longitude]
      : selectedRestaurant
        ? [selectedRestaurant.latitude, selectedRestaurant.longitude]
        : defaultCenter);
  const useDensePins = restaurants.length > 12;
  const zoomLevel =
    restaurants.length > 20 ? 14 : restaurants.length > 10 ? 15 : 16;

  return (
    <section className="map-shell">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] flex items-start justify-between gap-3 p-3 sm:p-4">
        {campus ? (
          <div className="surface-card inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-slate-900 shadow-sm sm:text-sm">
            <MapPinIcon className="h-4 w-4 text-green-700" />
            {campus.name}
          </div>
        ) : null}

        <div className="surface-card hidden rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-sm sm:block">
          Nearby picks
        </div>
      </div>

      <MapContainer
        center={center}
        className={`${heightClassName} map-surface w-full`}
        key={`${center[0]}-${center[1]}-${restaurants.length}-${selectedRestaurantId ?? 0}-${userLocation?.latitude ?? 0}`}
        scrollWheelZoom={false}
        zoom={zoomLevel}
        zoomControl={false}
      >
        <MapViewportController
          campus={campus}
          center={center}
          restaurants={restaurants}
          userLocation={userLocation}
          zoomLevel={zoomLevel}
        />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {campus ? (
          <CircleMarker
            center={[campus.latitude, campus.longitude]}
            color="#168A2B"
            fillColor="#168A2B"
            fillOpacity={0.15}
            pathOptions={{ weight: 2 }}
            radius={24}
          />
        ) : null}

        {userLocation ? (
          <>
            <CircleMarker
              center={[userLocation.latitude, userLocation.longitude]}
              color="#2563eb"
              fillColor="#60a5fa"
              fillOpacity={0.18}
              pathOptions={{ weight: 1.5 }}
              radius={26}
            />
            <CircleMarker
              center={[userLocation.latitude, userLocation.longitude]}
              color="#ffffff"
              fillColor="#2563eb"
              fillOpacity={1}
              pathOptions={{ weight: 3 }}
              radius={8}
            >
              <Popup>You are here</Popup>
            </CircleMarker>
          </>
        ) : null}

        {restaurants.map((restaurant) => {
          const isSelected = restaurant.id === selectedRestaurantId;

          return (
            <Marker
              eventHandlers={{
                click: () => onSelectRestaurant?.(restaurant.id),
              }}
              icon={isSelected ? selectedPinIcon : useDensePins ? denseRegularPinIcon : regularPinIcon}
              key={restaurant.id}
              position={[restaurant.latitude, restaurant.longitude]}
            >
              <Popup>
                <div className="space-y-1">
                  <p className="font-semibold text-slate-950">{restaurant.name}</p>
                  <p className="text-sm text-slate-500">
                    {restaurant.cuisine} · {restaurant.budget}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {selectedRestaurant && showSelectedSummary ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[500] hidden p-4 sm:block">
          <div className="surface-card flex items-center justify-between gap-3 rounded-[16px] px-4 py-3 shadow-lg">
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-slate-950">
                {selectedRestaurant.name}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {selectedRestaurant.cuisine} · {selectedRestaurant.campus.suburb}
              </p>
            </div>
            <div className="shrink-0 rounded-full bg-green-50 px-3 py-1.5 text-sm font-semibold text-green-700">
              <span className="inline-flex items-center gap-1">
                <WalkIcon className="h-4 w-4" />
                {Math.max(1, Math.round(selectedRestaurant.distanceFromCampusKm * 12))} min
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function MapViewportController({
  campus,
  center,
  restaurants,
  userLocation,
  zoomLevel,
}: {
  campus: Campus | null;
  center: [number, number];
  restaurants: RestaurantSummary[];
  userLocation?: Coordinates | null;
  zoomLevel: number;
}) {
  const map = useMap();
  const restaurantKey = restaurants.map((restaurant) => restaurant.id).join("-");

  useEffect(() => {
    const points: [number, number][] = restaurants.map((restaurant) => [
      restaurant.latitude,
      restaurant.longitude,
    ]);

    if (campus) {
      points.push([campus.latitude, campus.longitude]);
    }

    if (userLocation) {
      points.push([userLocation.latitude, userLocation.longitude]);
    }

    if (points.length >= 2) {
      map.fitBounds(L.latLngBounds(points), {
        animate: false,
        maxZoom: zoomLevel,
        padding: [34, 34],
      });
      return;
    }

    map.setView(center, zoomLevel, { animate: false });
  }, [
    map,
    campus?.id,
    center,
    restaurantKey,
    userLocation?.latitude,
    userLocation?.longitude,
    zoomLevel,
  ]);

  return null;
}
