import { Link } from "react-router-dom";
import {
  BookmarkIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CompassIcon,
  LeafBadgeIcon,
  MapPinIcon,
  SparklesIcon,
  StarIcon,
  WalkIcon,
} from "../components/Icons";
import { MapPanel } from "../components/MapPanel";
import { RestaurantCard } from "../components/RestaurantCard";
import { StatePanel } from "../components/StatePanel";
import { useExplorer } from "../context/ExplorerContext";
import { formatDistance } from "../lib/format";
import { formatBudgetRange, getWalkingMinutes } from "../lib/restaurantDisplay";

function getCampusLabel(args: {
  isError: boolean;
  isLoading: boolean;
  selectedCampusName?: string;
}) {
  if (args.isError) {
    return "Campus unavailable";
  }

  if (args.isLoading) {
    return "Loading campus...";
  }

  return args.selectedCampusName ?? "Select campus";
}

export function MapPage() {
  const {
    campuses,
    campusesQuery,
    displayRestaurants,
    getRestaurantDistanceKm,
    isLocating,
    isSaved,
    locationError,
    queryFilters,
    recommendation,
    requestUserLocation,
    restaurantsQuery,
    selectedCampus,
    selectedRestaurant,
    selectedRestaurantId,
    setCampusId,
    setSelectedRestaurantId,
    setSortMode,
    sortMode,
    toggleSaved,
    userLocation,
  } = useExplorer();

  const campusLabel = getCampusLabel({
    isError: campusesQuery.isError,
    isLoading: campusesQuery.isLoading,
    selectedCampusName: selectedCampus?.name,
  });

  const usingUserLocation = Boolean(userLocation && sortMode === "me");

  const handleUseMyLocation = () => {
    if (userLocation) {
      setSortMode("me");
      return;
    }

    requestUserLocation();
  };

  return (
    <div className="space-y-3">
      <section className="space-y-2.5 pt-0.5">
        <div className="flex items-center gap-3">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-green-700">
              Map view
            </p>
            <Link
              className="inline-flex items-end gap-1 text-[clamp(1.7rem,6.8vw,2.2rem)] font-extrabold leading-none tracking-[-0.05em]"
              to="/discover"
            >
              <span className="text-green-700">Uni</span>
              <span className="text-orange-500">Bite</span>
              <LeafBadgeIcon className="mb-2 h-4 w-4 text-green-600 sm:h-5 sm:w-5" />
            </Link>
          </div>
        </div>

        <div className="relative min-w-0">
          <div className="flex h-11 items-center rounded-[14px] border border-[var(--border)] bg-white pl-[44px] pr-[40px] text-[14px] font-semibold text-slate-950 shadow-sm sm:h-12 sm:rounded-[16px] sm:pl-[52px] sm:pr-[44px] sm:text-[15px]">
            <span className="truncate">{campusLabel}</span>
          </div>
          <MapPinIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-green-700 sm:left-[14px]" />
          <select
            aria-label="Select campus"
            className="absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-[16px] opacity-0"
            disabled={campusesQuery.isLoading || campusesQuery.isError}
            onChange={(event) => setCampusId(Number(event.target.value))}
            value={selectedCampus?.id ?? ""}
          >
            {!campuses.length ? (
              <option disabled value="">
                {campusesQuery.isError ? "Campus unavailable" : "Loading campus..."}
              </option>
            ) : null}
            {campuses.map((campus) => (
              <option key={campus.id} value={campus.id}>
                {campus.name}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 sm:right-[14px]" />
        </div>
      </section>

      <div className="lg:grid lg:grid-cols-[minmax(0,1.1fr)_360px] lg:gap-5">
        <section className="space-y-3 lg:sticky lg:top-4 lg:self-start">
          <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1 pr-4">
            <button
              className={`inline-flex h-10 shrink-0 items-center rounded-full border px-4 text-sm font-semibold shadow-sm transition ${
                usingUserLocation
                  ? "border-sky-200 bg-sky-50 text-sky-700"
                  : "border-[var(--border)] bg-white text-slate-700"
              }`}
              onClick={handleUseMyLocation}
              type="button"
            >
              {isLocating
                ? "Finding..."
                : "My location"}
            </button>

            <button
              className={`inline-flex h-10 shrink-0 items-center rounded-full border px-4 text-sm font-semibold shadow-sm transition ${
                !usingUserLocation
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-[var(--border)] bg-white text-slate-700"
              }`}
              onClick={() => setSortMode("campus")}
              type="button"
            >
              Campus
            </button>

            <button
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-[var(--border)] bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition"
              disabled={!queryFilters.campusId || recommendation.isPending}
              onClick={() => recommendation.mutate()}
              type="button"
            >
              <SparklesIcon className="h-4 w-4 text-green-700" />
              Pick
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold text-slate-600 shadow-sm">
              {selectedCampus?.name ?? "Campus"}
            </span>
            <span
              className={`rounded-full px-3 py-1.5 text-[13px] font-semibold ${
                usingUserLocation
                  ? "bg-sky-50 text-sky-700"
                  : "bg-green-50 text-green-700"
              }`}
            >
              {usingUserLocation ? "Showing distance from you" : "Showing campus distance"}
            </span>
          </div>

          <div className="surface-soft flex items-center justify-between gap-3 px-3 py-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-green-700">
                GPS sorting
              </p>
              <p className="mt-1 truncate text-sm text-slate-600">
                {usingUserLocation
                  ? "Pins and list are sorted from your current location."
                  : "Switch to device GPS if you want the closest walk right now."}
              </p>
            </div>

            <button
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-[var(--border)] bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm"
              onClick={usingUserLocation ? () => setSortMode("campus") : handleUseMyLocation}
              type="button"
            >
              <CompassIcon className="h-4 w-4 text-green-700" />
              {usingUserLocation ? "Campus" : "Use GPS"}
            </button>
          </div>

          <MapPanel
            campus={selectedCampus}
            centerOverride={
              userLocation && sortMode === "me"
                ? [userLocation.latitude, userLocation.longitude]
                : undefined
            }
            heightClassName="h-[58vh] min-h-[460px] max-h-[680px] md:h-[64vh] lg:h-[calc(100vh-220px)] lg:min-h-[560px] lg:max-h-[780px]"
            onSelectRestaurant={setSelectedRestaurantId}
            restaurants={displayRestaurants}
            selectedRestaurantId={selectedRestaurantId}
            showSelectedSummary
            userLocation={userLocation}
          />

          {locationError ? (
            <p className="rounded-[14px] border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {locationError}
            </p>
          ) : null}
        </section>

        <aside className="mt-3 space-y-3 lg:mt-0">
          {selectedRestaurant ? (
            <div className="surface-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-green-700">
                    Selected pin
                  </p>
                  <h2 className="mt-1 truncate text-[1.45rem] font-extrabold tracking-tight text-slate-950">
                    {selectedRestaurant.name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedRestaurant.cuisine} · {selectedRestaurant.campus.suburb}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <div className="flex items-center justify-end gap-1 text-orange-500">
                    <StarIcon className="h-4 w-4" />
                    <span className="text-base font-extrabold text-slate-950">
                      {selectedRestaurant.averageRating?.toFixed(1) ?? "--"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">({selectedRestaurant.ratingCount})</p>
                </div>
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                {selectedRestaurant.description}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-green-50 px-3 py-1.5 text-[13px] font-semibold text-green-700">
                  {selectedRestaurant.budget} · {formatBudgetRange(selectedRestaurant.budget)}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[13px] font-semibold text-slate-600">
                  {formatDistance(getRestaurantDistanceKm(selectedRestaurant))}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[13px] font-semibold text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <WalkIcon className="h-4 w-4" />
                    {getWalkingMinutes(getRestaurantDistanceKm(selectedRestaurant))} min
                  </span>
                </span>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Link
                  className="button-primary flex-1 px-4 text-sm"
                  to={`/restaurants/${selectedRestaurant.id}`}
                >
                  Open details
                  <ChevronRightIcon className="h-4 w-4" />
                </Link>

                <button
                  aria-label={
                    isSaved(selectedRestaurant.id)
                      ? "Remove from saved"
                      : "Save restaurant"
                  }
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-full border ${
                    isSaved(selectedRestaurant.id)
                      ? "border-green-200 bg-green-50 text-green-700"
                      : "border-slate-200 bg-white text-slate-500"
                  }`}
                  onClick={() => toggleSaved(selectedRestaurant.id)}
                  type="button"
                >
                  <BookmarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          ) : null}

          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-green-700">
                On the map
              </p>
              <h2 className="mt-1 text-[1.55rem] font-extrabold tracking-tight text-slate-950">
                Nearby spots
              </h2>
            </div>
            <p className="text-sm text-slate-500">{displayRestaurants.length} places</p>
          </div>

          {restaurantsQuery.isLoading ? (
            <div className="grid gap-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div className="surface-card h-36 animate-pulse" key={index} />
              ))}
            </div>
          ) : restaurantsQuery.isError ? (
            <StatePanel
              message={restaurantsQuery.error.message}
              title="Map data unavailable"
            />
          ) : displayRestaurants.length === 0 ? (
            <StatePanel
              message="Change one of the active filters or switch campuses to see more options."
              title="No spots match right now"
            />
          ) : (
            <div className="grid gap-3">
              {displayRestaurants.map((restaurant) => (
                <RestaurantCard
                  distanceKm={getRestaurantDistanceKm(restaurant)}
                  featured={recommendation.data?.id === restaurant.id}
                  isSaved={isSaved(restaurant.id)}
                  isSelected={selectedRestaurantId === restaurant.id}
                  key={restaurant.id}
                  onSelect={() => setSelectedRestaurantId(restaurant.id)}
                  onToggleSaved={() => toggleSaved(restaurant.id)}
                  restaurant={restaurant}
                />
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
