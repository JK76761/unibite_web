import type { RestaurantSummary } from "../types/api";

const tileColors = [
  ["#dff4df", "#f4fbf4"],
  ["#fff0de", "#fff9f0"],
  ["#e7f3ff", "#f6fbff"],
  ["#edf7f0", "#fff7ee"],
  ["#f6f0ff", "#faf7ff"],
];

const moodReasons: Record<string, string> = {
  Adventurous: "Worth trying when you want something different",
  "Cheat Day": "Big flavours for a proper treat meal",
  "Comfort Bowl": "Warm, comforting, and easy between classes",
  "Date Night": "A nicer pick when you want to linger",
  "Group Catch-up": "Easy choice when nobody can decide",
  "Hearty Meal": "A filling option that lasts through the afternoon",
  "Late Night": "Reliable when study sessions run long",
  "Post Gym": "Fresh fuel after training",
  "Quick Bite": "Fast enough for a tight class gap",
  "Social Lunch": "Great for a casual lunch break with friends",
  "Study Session": "Good spot for a quiet refuel",
  "Sweet Treat": "A quick reward after class",
};

export function formatBudgetRange(budget: string) {
  switch (budget) {
    case "$":
      return "Under $15";
    case "$$":
      return "$15–25";
    case "$$$":
      return "$25+";
    default:
      return budget;
  }
}

export function getWalkingMinutes(distanceFromCampusKm: number) {
  return Math.max(1, Math.round(distanceFromCampusKm * 12));
}

export function getRecommendationReason(restaurant: RestaurantSummary) {
  if (restaurant.budget === "$" && restaurant.mood === "Quick Bite") {
    return "Quick lunch under $15";
  }

  if (restaurant.budget === "$" && restaurant.mood === "Study Session") {
    return "Affordable study-break fuel";
  }

  if (restaurant.averageRating !== null && restaurant.averageRating >= 4.5) {
    return "Student fave with standout ratings";
  }

  return moodReasons[restaurant.mood] ?? "Handy pick close to campus";
}

export function getRestaurantTileStyle(restaurantName: string) {
  const hash = restaurantName.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  const [start, end] = tileColors[hash % tileColors.length];

  return {
    backgroundImage: `linear-gradient(145deg, ${start}, ${end})`,
  };
}

export function getRestaurantMonogram(restaurantName: string) {
  const words = restaurantName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return "UB";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}
