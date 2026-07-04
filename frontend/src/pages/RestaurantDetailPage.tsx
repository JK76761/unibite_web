import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { AppHeader } from "../components/AppHeader";
import { MapPanel } from "../components/MapPanel";
import { MapPinIcon, StarIcon } from "../components/Icons";
import { RatingForm } from "../components/RatingForm";
import { StatePanel } from "../components/StatePanel";
import { getRestaurant } from "../lib/api";
import { formatDate, formatDistance } from "../lib/format";
import { getRestaurantArtwork } from "../lib/restaurantMedia";
import {
  formatBudgetRange,
  getRecommendationReason,
  getWalkingMinutes,
} from "../lib/restaurantDisplay";

export function RestaurantDetailPage() {
  const params = useParams();
  const restaurantId = Number(params.id);
  const isValidRestaurantId = Number.isInteger(restaurantId) && restaurantId > 0;

  const restaurantQuery = useQuery({
    queryKey: ["restaurant", restaurantId],
    queryFn: () => getRestaurant(restaurantId),
    enabled: isValidRestaurantId,
  });

  if (!isValidRestaurantId) {
    return (
      <StatePanel
        message="The restaurant id in the URL is not valid."
        title="Invalid restaurant"
      />
    );
  }

  if (restaurantQuery.isLoading) {
    return (
      <StatePanel
        message="Loading restaurant details, the latest ratings, and map context."
        title="Fetching restaurant"
      />
    );
  }

  if (restaurantQuery.isError) {
    return (
      <StatePanel
        action={
          <Link className="button-primary px-5" to="/discover">
            Back to discover
          </Link>
        }
        message={restaurantQuery.error.message}
        title="Restaurant not available"
      />
    );
  }

  const restaurant = restaurantQuery.data;

  if (!restaurant) {
    return (
      <StatePanel
        message="No restaurant details were returned."
        title="Restaurant not available"
      />
    );
  }

  const artwork = getRestaurantArtwork(
    restaurant.name,
    restaurant.cuisine,
    restaurant.photoUrl,
  );

  return (
    <div className="space-y-5">
      <AppHeader
        subtitle="See the full summary, current rating, map context, and real student reviews before you decide."
        title="Spot details"
      />

      <div className="flex flex-wrap items-center gap-3">
        <Link className="button-secondary px-4 text-sm" to="/discover">
          Back to discover
        </Link>
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
          <MapPinIcon className="h-4 w-4 text-green-700" />
          {restaurant.campus.name}
        </span>
      </div>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-5">
          <article className="surface-card p-5 sm:p-6">
            <div className="overflow-hidden rounded-[22px] border border-[var(--border)]">
              <img
                alt={`${restaurant.name} food illustration`}
                className="h-[240px] w-full object-cover sm:h-[320px]"
                src={artwork.imageUrl}
              />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2 text-sm font-semibold text-green-700">
              <span className="rounded-full bg-green-50 px-3 py-1">
                {restaurant.budget} · {formatBudgetRange(restaurant.budget)}
              </span>
              <span className="rounded-full bg-orange-50 px-3 py-1 text-orange-600">
                {restaurant.cuisine}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                {restaurant.mood}
              </span>
            </div>

            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
              {restaurant.name}
            </h1>

            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
              {restaurant.description}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="surface-soft p-4">
                <p className="text-sm text-slate-500">Walking time</p>
                <p className="mt-2 text-xl font-extrabold text-slate-950">
                  {getWalkingMinutes(restaurant.distanceFromCampusKm)} min
                </p>
              </div>
              <div className="surface-soft p-4">
                <p className="text-sm text-slate-500">Distance</p>
                <p className="mt-2 text-xl font-extrabold text-slate-950">
                  {formatDistance(restaurant.distanceFromCampusKm)}
                </p>
              </div>
              <div className="surface-soft p-4">
                <p className="text-sm text-slate-500">Rating</p>
                <p className="mt-2 inline-flex items-center gap-2 text-xl font-extrabold text-slate-950">
                  <StarIcon className="h-5 w-5 text-orange-500" />
                  {restaurant.averageRating?.toFixed(1) ?? "--"}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {restaurant.ratingCount} reviews
                </p>
              </div>
              <div className="surface-soft p-4">
                <p className="text-sm text-slate-500">Added</p>
                <p className="mt-2 text-xl font-extrabold text-slate-950">
                  {formatDate(restaurant.createdAtUtc)}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-[12px] bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
              {getRecommendationReason(restaurant)}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-600">
                {restaurant.address}
              </span>
              {restaurant.websiteUrl ? (
                <a
                  className="button-primary px-5 text-sm"
                  href={restaurant.websiteUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Visit website
                </a>
              ) : null}
            </div>
          </article>

          <RatingForm restaurantId={restaurant.id} />
        </div>

        <div className="space-y-5">
          <MapPanel
            campus={restaurant.campus}
            restaurants={[restaurant]}
            selectedRestaurantId={restaurant.id}
            showSelectedSummary
          />

          <section className="surface-card p-5 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-green-700">
              Recent reviews
            </p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">
              What students are saying
            </h2>

            {restaurant.ratings.length === 0 ? (
              <p className="surface-soft mt-4 px-4 py-4 text-sm text-slate-600">
                No reviews yet. Be the first to add one.
              </p>
            ) : (
              <div className="mt-4 grid gap-3">
                {restaurant.ratings.map((rating) => (
                  <article className="surface-soft p-4" key={rating.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-extrabold text-slate-950">
                        {rating.reviewerName}
                      </p>
                      <p className="text-sm text-slate-500">
                        {rating.score}/5 · {formatDate(rating.createdAtUtc)}
                      </p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {rating.comment || "No written comment left."}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
