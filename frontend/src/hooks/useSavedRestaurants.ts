import { useEffect, useState } from "react";

const STORAGE_KEY = "unibite.saved.restaurant.ids";

export function useSavedRestaurants() {
  const [savedIds, setSavedIds] = useState<number[]>([]);

  useEffect(() => {
    try {
      const rawValue = window.localStorage.getItem(STORAGE_KEY);
      if (!rawValue) {
        return;
      }

      const parsed = JSON.parse(rawValue) as unknown;
      if (Array.isArray(parsed)) {
        setSavedIds(parsed.filter((value): value is number => typeof value === "number"));
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const toggleSaved = (restaurantId: number) => {
    setSavedIds((current) => {
      const next = current.includes(restaurantId)
        ? current.filter((id) => id !== restaurantId)
        : [...current, restaurantId];

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return {
    savedIds,
    isSaved: (restaurantId: number) => savedIds.includes(restaurantId),
    toggleSaved,
  };
}
