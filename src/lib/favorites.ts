// お気に入り都市の型と localStorage 永続化ロジック

export type FavoriteCity = {
  id: string;
  name: string;
  country?: string;
  latitude?: number;
  longitude?: number;
};

export const MAX_FAVORITE_CITIES = 5;

const STORAGE_KEY = "weather-app:favorite-cities";

/** 緯度経度があればそれを優先して識別子を作る（同名都市の誤重複を防ぐ） */
export function makeFavoriteId(city: {
  name: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}): string {
  if (typeof city.latitude === "number" && typeof city.longitude === "number") {
    return `${city.latitude.toFixed(3)},${city.longitude.toFixed(3)}`;
  }
  return `${city.name.trim().toLowerCase()}|${(city.country ?? "").trim().toLowerCase()}`;
}

export function loadFavoriteCities(): FavoriteCity[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is FavoriteCity =>
        typeof item === "object" && item !== null && typeof item.id === "string" && typeof item.name === "string"
    );
  } catch {
    return [];
  }
}

export function saveFavoriteCities(cities: FavoriteCity[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cities));
}

export type AddFavoriteResult =
  | { ok: true; cities: FavoriteCity[] }
  | { ok: false; reason: "duplicate" | "limit-reached"; cities: FavoriteCity[] };

export function addFavoriteCity(
  cities: FavoriteCity[],
  city: Omit<FavoriteCity, "id">
): AddFavoriteResult {
  const id = makeFavoriteId(city);
  if (cities.some((c) => c.id === id)) {
    return { ok: false, reason: "duplicate", cities };
  }
  if (cities.length >= MAX_FAVORITE_CITIES) {
    return { ok: false, reason: "limit-reached", cities };
  }
  const next = [...cities, { ...city, id }];
  return { ok: true, cities: next };
}

export function removeFavoriteCity(cities: FavoriteCity[], id: string): FavoriteCity[] {
  return cities.filter((c) => c.id !== id);
}
