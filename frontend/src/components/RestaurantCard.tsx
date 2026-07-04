import { Link } from "react-router-dom";
import { formatDistance } from "../lib/format";
import {
  formatBudgetRange,
  getRecommendationReason,
  getRestaurantMonogram,
  getWalkingMinutes,
} from "../lib/restaurantDisplay";
import { getRestaurantArtwork } from "../lib/restaurantMedia";
import type { RestaurantSummary } from "../types/api";
import {
  BookmarkIcon,
  ChevronRightIcon,
  HeartIcon,
  StarIcon,
  WalkIcon,
} from "./Icons";

type RestaurantCardProps = {
  restaurant: RestaurantSummary;
  featured?: boolean;
  isSelected?: boolean;
  isSaved?: boolean;
  onSelect?: () => void;
  onToggleSaved?: () => void;
  showCampusName?: boolean;
  distanceKm?: number;
};

export function RestaurantCard({
  restaurant,
  featured = false,
  isSelected = false,
  isSaved = false,
  onSelect,
  onToggleSaved,
  showCampusName = false,
  distanceKm,
}: RestaurantCardProps) {
  const distance = distanceKm ?? restaurant.distanceFromCampusKm;
  const walkingMinutes = getWalkingMinutes(distance);
  const recommendationReason = getRecommendationReason(restaurant);
  const artwork = getRestaurantArtwork(
    restaurant.name,
    restaurant.cuisine,
    restaurant.photoUrl,
  );

  return (
    <article
      className={`surface-card transition ${
        isSelected ? "border-green-500 ring-2 ring-green-100" : ""
      } ${featured ? "bg-green-50/70" : ""}`}
    >
      <div
        className="grid cursor-pointer grid-cols-[92px_minmax(0,1fr)] gap-3 p-3 sm:grid-cols-[104px_minmax(0,1fr)]"
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect?.();
          }
        }}
        role="button"
        tabIndex={0}
      >
        <div className="relative overflow-hidden rounded-[8px] border border-white/70 bg-white">
          <img
            alt={`${restaurant.name} food illustration`}
            className="aspect-square h-full w-full object-cover"
            loading="lazy"
            src={artwork.imageUrl}
          />
          {artwork.showMonogramOverlay ? (
            <div
              className="absolute left-2.5 top-2.5 inline-flex h-9 w-9 items-center justify-center rounded-[8px] text-sm font-extrabold text-white shadow-md"
              style={{ backgroundColor: artwork.tone.dark }}
            >
              {getRestaurantMonogram(restaurant.name)}
            </div>
          ) : null}
          <div
            className="absolute inset-x-0 bottom-0 h-1.5"
            style={{ backgroundColor: artwork.tone.accent }}
          />
        </div>

        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-[1.15rem] font-extrabold tracking-tight text-slate-950 sm:text-[1.3rem]">
                  {restaurant.name}
                </h3>
                {featured ? (
                  <span className="rounded-full bg-green-700 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                    Picked
                  </span>
                ) : null}
              </div>

              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[14px] text-slate-500">
                <span>{restaurant.cuisine}</span>
                {showCampusName ? (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[12px] font-semibold text-slate-600">
                    {restaurant.campus.suburb}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="text-right">
              <div className="flex items-center justify-end gap-1 text-orange-500">
                <StarIcon className="h-4 w-4" />
                <span className="text-base font-extrabold text-slate-950 sm:text-lg">
                  {restaurant.averageRating?.toFixed(1) ?? "--"}
                </span>
              </div>
              <p className="text-xs text-slate-500 sm:text-sm">({restaurant.ratingCount})</p>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-slate-600 sm:text-[14px]">
            <span className="font-bold text-green-700">
              {restaurant.budget} · {formatBudgetRange(restaurant.budget)}
            </span>
            <span className="inline-flex items-center gap-1">
              <WalkIcon className="h-4 w-4" />
              {walkingMinutes} min
            </span>
            <span>{formatDistance(distance)}</span>
          </div>

          <div className="mt-2.5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <span className="inline-flex min-w-0 flex-1 items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-[12px] font-semibold text-green-700 sm:text-[13px]">
              <HeartIcon className="h-4 w-4" />
              <span className="truncate">{recommendationReason}</span>
            </span>

            <div className="flex shrink-0 items-center gap-1">
              <button
                aria-label={isSaved ? "Remove from saved" : "Save restaurant"}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full border ${
                  isSaved
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-slate-200 bg-white text-slate-500"
                }`}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleSaved?.();
                }}
                type="button"
              >
                {isSaved ? (
                  <HeartIcon className="h-4 w-4" />
                ) : (
                  <BookmarkIcon className="h-4 w-4" />
                )}
              </button>

              <Link
                aria-label="Open restaurant details"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-green-200 text-green-700 transition hover:bg-green-50 sm:h-auto sm:w-auto sm:border-0 sm:px-2 sm:py-1.5 sm:text-sm"
                onClick={(event) => event.stopPropagation()}
                to={`/restaurants/${restaurant.id}`}
              >
                <span className="sr-only sm:not-sr-only sm:mr-1">Details</span>
                <ChevronRightIcon className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
