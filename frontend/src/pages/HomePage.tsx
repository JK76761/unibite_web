import { Link } from "react-router-dom";
import { FilterPanel } from "../components/FilterPanel";
import { MapPanel } from "../components/MapPanel";
import { RestaurantCard } from "../components/RestaurantCard";
import {
  ChevronDownIcon,
  CompassIcon,
  LeafBadgeIcon,
  MapPinIcon,
  PlusCircleIcon,
  SparklesIcon,
} from "../components/Icons";
import { StatePanel } from "../components/StatePanel";
import { useExplorer } from "../context/ExplorerContext";

export function HomePage() {
  const {
    clearFilters,
    campuses,
    campusesQuery,
    displayRestaurants,
    filters,
    getRestaurantDistanceKm,
    hasCampusSelection,
    isLocating,
    isSaved,
    locationError,
    recommendation,
    requestUserLocation,
    restaurantsQuery,
    selectedCampus,
    selectedRestaurant,
    selectedRestaurantId,
    setFilter,
    setCampusId,
    setSelectedRestaurantId,
    setSortMode,
    sortMode,
    toggleSaved,
    userLocation,
  } = useExplorer();

  const isWaitingForCampus =
    campusesQuery.isLoading || (!hasCampusSelection && !restaurantsQuery.isError);
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
      <div className="lg:grid lg:grid-cols-[420px_minmax(0,1fr)] lg:gap-6">
        <aside className="space-y-2.5 lg:sticky lg:top-4 lg:self-start">
          <section className="pt-0.5">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <Link
                className="inline-flex shrink-0 items-end gap-1 text-[clamp(1.7rem,6.8vw,2.2rem)] font-extrabold leading-none tracking-[-0.05em]"
                to="/discover"
              >
                <span className="text-green-700">Uni</span>
                <span className="text-orange-500">Bite</span>
                <LeafBadgeIcon className="mb-2 h-4 w-4 text-green-600 sm:h-5 sm:w-5" />
              </Link>

              <div className="relative min-w-0 w-full flex-1">
                <div className="flex h-11 items-center rounded-[14px] border border-[var(--border)] bg-white pl-[44px] pr-[40px] text-[14px] font-semibold text-slate-950 shadow-sm sm:h-12 sm:rounded-[16px] sm:pl-[52px] sm:pr-[44px] sm:text-[15px]">
                  <span className="truncate">
                    {campusesQuery.isError
                      ? "Campus unavailable"
                      : campusesQuery.isLoading
                        ? "Loading campus..."
                      : selectedCampus?.name ?? "Select campus"}
                  </span>
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
            </div>
          </section>

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
              {isLocating ? "Finding..." : "My location"}
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
          </div>

          <div className="surface-soft flex items-center justify-between gap-3 px-3 py-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-green-700">
                Distance mode
              </p>
              <p className="mt-1 truncate text-sm text-slate-600">
                {usingUserLocation
                  ? "Showing the closest picks from your current device location."
                  : "Showing distance from the selected campus first."}
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
              usingUserLocation && userLocation
                ? [userLocation.latitude, userLocation.longitude]
                : undefined
            }
            heightClassName="h-[264px] min-h-[264px] max-h-[296px] sm:h-[276px] md:h-[360px] lg:h-[420px]"
            onSelectRestaurant={setSelectedRestaurantId}
            restaurants={displayRestaurants.slice(0, 24)}
            selectedRestaurantId={selectedRestaurantId}
            userLocation={userLocation}
          />

          {locationError ? (
            <p className="rounded-[12px] border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {locationError}
            </p>
          ) : null}

          <FilterPanel
            budget={filters.budget}
            cuisine={filters.cuisine}
            maxDistanceKm={filters.maxDistanceKm}
            mood={filters.mood}
            onChange={(field, value) => {
              setFilter(field, value);
            }}
            onClear={clearFilters}
            search={filters.search}
          />

          {selectedRestaurant ? (
            <div className="surface-card hidden p-4 lg:block">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-green-700">
                Current pick
              </p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">
                {selectedRestaurant.name}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {selectedRestaurant.description}
              </p>
              <Link
                className="button-secondary mt-4 w-full px-4 text-sm"
                to={`/restaurants/${selectedRestaurant.id}`}
              >
                Read details
              </Link>
            </div>
          ) : null}
        </aside>

        <section className="mt-3 space-y-3 lg:mt-0 lg:space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-green-700">
                Top picks
              </p>
              <h2 className="mt-1 text-[1.7rem] font-extrabold tracking-tight text-slate-950 sm:text-[2.15rem]">
                Top picks near you
              </h2>
              {selectedCampus ? (
                <p className="mt-1 text-sm text-slate-500">
                  {usingUserLocation
                    ? "Sorted by your current location"
                    : `Around ${selectedCampus.name}`}
                </p>
              ) : null}
            </div>
          </div>

          {recommendation.isError ? (
            <p className="rounded-[12px] bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {recommendation.error.message}
            </p>
          ) : null}

          {isWaitingForCampus ? (
            <div className="grid gap-3">
              {Array.from({ length: 2 }).map((_, index) => (
                <div className="surface-card h-36 animate-pulse" key={index} />
              ))}
            </div>
          ) : restaurantsQuery.isError ? (
            <StatePanel
              message={restaurantsQuery.error.message}
              title="Restaurant results failed to load"
            />
          ) : displayRestaurants.length === 0 ? (
            <StatePanel
              action={
                <Link className="button-secondary px-5" to="/add">
                  Suggest a new spot
                </Link>
              }
              message="Try broadening the filters, switching campuses, or submitting a spot you think should be listed."
              title="No matches for this campus"
            />
          ) : (
            <div className="grid gap-3">
              {displayRestaurants.slice(0, 8).map((restaurant) => (
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

          <div className="grid gap-3 lg:hidden">
            <button
              className="button-primary w-full px-5"
              disabled={!hasCampusSelection || recommendation.isPending}
              onClick={() => recommendation.mutate()}
              type="button"
            >
              <SparklesIcon className="h-5 w-5" />
              {recommendation.isPending ? "Picking..." : "Pick for me"}
            </button>

            <Link className="button-secondary w-full px-5" to="/add">
              <PlusCircleIcon className="h-5 w-5" />
              Add a spot
            </Link>
          </div>

          <div className="hidden lg:flex lg:flex-wrap lg:gap-2">
            <button
              className="button-primary px-5"
              disabled={!hasCampusSelection || recommendation.isPending}
              onClick={() => recommendation.mutate()}
              type="button"
            >
              <SparklesIcon className="h-5 w-5" />
              {recommendation.isPending ? "Picking..." : "Pick for me"}
            </button>

            <Link className="button-secondary px-5" to="/add">
              <PlusCircleIcon className="h-5 w-5" />
              Add a spot
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
