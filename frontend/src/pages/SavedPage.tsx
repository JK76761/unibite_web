import { Link } from "react-router-dom";
import { AppHeader } from "../components/AppHeader";
import { RestaurantCard } from "../components/RestaurantCard";
import { StatePanel } from "../components/StatePanel";
import { useExplorer } from "../context/ExplorerContext";

export function SavedPage() {
  const {
    getRestaurantDistanceKm,
    isSaved,
    savedRestaurants,
    selectedRestaurantId,
    setSelectedRestaurantId,
    toggleSaved,
  } = useExplorer();

  return (
    <div className="space-y-5">
      <AppHeader
        subtitle="Keep the spots you actually want to revisit without scrolling through the full list again."
        title="Saved picks"
      />

      {savedRestaurants.length === 0 ? (
        <StatePanel
          action={
            <Link className="button-primary px-5" to="/discover">
              Browse restaurants
            </Link>
          }
          message="Save a spot from discover or map view and it will stay here on this device."
          title="Nothing saved yet"
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {savedRestaurants.map((restaurant) => (
            <RestaurantCard
              distanceKm={getRestaurantDistanceKm(restaurant)}
              isSaved={isSaved(restaurant.id)}
              isSelected={selectedRestaurantId === restaurant.id}
              key={restaurant.id}
              onSelect={() => setSelectedRestaurantId(restaurant.id)}
              onToggleSaved={() => toggleSaved(restaurant.id)}
              restaurant={restaurant}
              showCampusName
            />
          ))}
        </div>
      )}
    </div>
  );
}
