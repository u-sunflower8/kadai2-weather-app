"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import DateSelect from "@/components/DateSelect";
import PhotographyScores from "@/components/PhotographyScores";
import Recommendations from "@/components/Recommendations";
import type { WeatherApiResponse } from "@/lib/weather";
import {
  MAX_FAVORITE_CITIES,
  addFavoriteCity,
  loadFavoriteCities,
  makeFavoriteId,
  removeFavoriteCity,
  saveFavoriteCities,
  type FavoriteCity,
} from "@/lib/favorites";

type LocationQuery = { city: string } | { lat: number; lon: number };

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

export default function Home() {
  const [cityInput, setCityInput] = useState("Tokyo");
  const [locationQuery, setLocationQuery] = useState<LocationQuery>({ city: "Tokyo" });
  const [selectedDate, setSelectedDate] = useState<string>(todayKey());
  const [weather, setWeather] = useState<WeatherApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteCity[]>([]);
  const [favoriteMessage, setFavoriteMessage] = useState<string | null>(null);

  const fetchWeather = useCallback(async (query: LocationQuery, date: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if ("city" in query) {
        params.set("city", query.city);
      } else {
        params.set("lat", String(query.lat));
        params.set("lon", String(query.lon));
      }
      params.set("date", date);

      const res = await fetch(`/api/weather?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "天気情報の取得に失敗しました。");
      }
      setWeather(data as WeatherApiResponse);
      setSelectedDate((data as WeatherApiResponse).date);
    } catch (e) {
      setError(e instanceof Error ? e.message : "不明なエラーが発生しました。");
      setWeather(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 初回マウント時に既定都市の天気を取得する（外部 API との同期）
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchWeather({ city: "Tokyo" }, todayKey());
    setFavorites(loadFavoriteCities());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!favoriteMessage) return;
    const timer = setTimeout(() => setFavoriteMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [favoriteMessage]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cityInput.trim()) return;
    const query: LocationQuery = { city: cityInput.trim() };
    setLocationQuery(query);
    fetchWeather(query, selectedDate);
  }

  function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      setError("このブラウザは現在地取得に対応していません。");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const query: LocationQuery = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setLocationQuery(query);
        setGeoLoading(false);
        fetchWeather(query, selectedDate);
      },
      () => {
        setGeoLoading(false);
        setError("現在地の取得が許可されませんでした。");
      }
    );
  }

  function handleSelectDate(date: string) {
    setSelectedDate(date);
    fetchWeather(locationQuery, date);
  }

  function handleToggleFavorite() {
    if (!weather) return;
    const candidate = {
      name: weather.location.name,
      country: weather.location.country,
      latitude: weather.location.lat,
      longitude: weather.location.lon,
    };
    const id = makeFavoriteId(candidate);
    const alreadyFavorite = favorites.some((c) => c.id === id);

    if (alreadyFavorite) {
      const next = removeFavoriteCity(favorites, id);
      setFavorites(next);
      saveFavoriteCities(next);
      return;
    }

    const result = addFavoriteCity(favorites, candidate);
    if (!result.ok) {
      setFavoriteMessage(
        result.reason === "limit-reached"
          ? `お気に入り都市は最大${MAX_FAVORITE_CITIES}件までです。`
          : "この都市はすでにお気に入りに登録されています。"
      );
      return;
    }
    setFavorites(result.cities);
    saveFavoriteCities(result.cities);
  }

  function handleSelectFavorite(city: FavoriteCity) {
    const query: LocationQuery =
      typeof city.latitude === "number" && typeof city.longitude === "number"
        ? { lat: city.latitude, lon: city.longitude }
        : { city: city.name };
    setLocationQuery(query);
    setCityInput(city.name);
    fetchWeather(query, selectedDate);
  }

  const currentFavoriteId = weather
    ? makeFavoriteId({
        name: weather.location.name,
        country: weather.location.country,
        latitude: weather.location.lat,
        longitude: weather.location.lon,
      })
    : null;
  const isCurrentFavorite = currentFavoriteId
    ? favorites.some((c) => c.id === currentFavoriteId)
    : false;

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-sky-50 to-white px-4 py-4 dark:from-slate-950 dark:to-slate-900 md:h-screen md:overflow-hidden">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-3 md:min-h-0">
        <h1 className="text-center text-xl font-bold text-slate-800 dark:text-slate-100">
          天気予報アプリ
        </h1>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <input
              type="text"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              placeholder="都市名を入力 (例: Tokyo, Osaka)"
              className="w-56 rounded-md border border-black/10 bg-white px-3 py-1.5 text-sm shadow-sm outline-none focus:border-sky-500 dark:border-white/10 dark:bg-slate-800 dark:text-white"
            />
            <button
              type="submit"
              className="rounded-md bg-sky-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
            >
              検索
            </button>
          </form>

          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={geoLoading}
            className="text-sm font-medium text-sky-700 underline-offset-2 hover:underline disabled:opacity-50 dark:text-sky-400"
          >
            {geoLoading ? "現在地を取得中..." : "📍 現在地の天気を表示"}
          </button>
        </div>

        {(favorites.length > 0 || favoriteMessage) && (
          <div className="flex flex-col items-center gap-1">
            {favorites.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                {favorites.map((city) => (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => handleSelectFavorite(city)}
                    className="rounded-full border border-sky-600/30 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 hover:bg-sky-100 dark:border-sky-400/30 dark:bg-sky-950/40 dark:text-sky-300 dark:hover:bg-sky-950/70"
                  >
                    ♥ {city.name}
                    {city.country ? `, ${city.country}` : ""}
                  </button>
                ))}
              </div>
            )}
            {favoriteMessage && (
              <p className="text-center text-xs text-amber-600 dark:text-amber-400">
                {favoriteMessage}
              </p>
            )}
          </div>
        )}

        <div className="grid flex-1 grid-cols-1 gap-4 md:min-h-0 md:grid-cols-3">
          <div className="flex h-full w-full flex-col rounded-xl border border-black/10 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
            {loading && <p className="text-sm text-black/60 dark:text-white/60">読み込み中...</p>}
            {error && !loading && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            {!loading && !error && weather && (
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                      {weather.location.name}
                      {weather.location.country ? `, ${weather.location.country}` : ""}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <DateSelect
                        selectedDate={selectedDate}
                        availableDates={weather.availableDates}
                        onSelect={handleSelectDate}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleFavorite}
                    aria-label={isCurrentFavorite ? "お気に入りから削除" : "お気に入りに追加"}
                    aria-pressed={isCurrentFavorite}
                    className="shrink-0 text-2xl leading-none text-rose-500 transition-transform hover:scale-110"
                  >
                    {isCurrentFavorite ? "♥" : "♡"}
                  </button>
                </div>

                {weather.current && (
                  <div className="flex items-center gap-3">
                    <Image
                      src={`https://openweathermap.org/img/wn/${weather.current.icon}@2x.png`}
                      alt={weather.current.weatherDescription}
                      width={56}
                      height={56}
                    />
                    <div>
                      <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                        {Math.round(weather.current.temp)}°C
                      </p>
                      <p className="text-sm capitalize text-black/60 dark:text-white/60">
                        {weather.current.weatherDescription}
                      </p>
                    </div>
                  </div>
                )}

                {weather.day && (
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    {!weather.current && (
                      <div className="col-span-2 flex items-center gap-3">
                        <Image
                          src={`https://openweathermap.org/img/wn/${weather.day.icon}@2x.png`}
                          alt={weather.day.weatherDescription}
                          width={48}
                          height={48}
                        />
                        <span className="capitalize text-black/70 dark:text-white/70">
                          {weather.day.weatherDescription}
                        </span>
                      </div>
                    )}
                    <dt className="text-black/50 dark:text-white/50">最高 / 最低気温</dt>
                    <dd className="text-right font-medium text-slate-800 dark:text-slate-100">
                      {Math.round(weather.day.tempMax)}°C / {Math.round(weather.day.tempMin)}°C
                    </dd>
                    <dt className="text-black/50 dark:text-white/50">湿度</dt>
                    <dd className="text-right font-medium text-slate-800 dark:text-slate-100">
                      {Math.round(weather.day.humidityAvg)}%
                    </dd>
                    <dt className="text-black/50 dark:text-white/50">降水確率</dt>
                    <dd className="text-right font-medium text-slate-800 dark:text-slate-100">
                      {weather.day.pop}%
                    </dd>
                  </dl>
                )}

                {!weather.day && (
                  <p className="text-sm text-black/50 dark:text-white/50">
                    この日付の予報データはありません。
                  </p>
                )}

                <p className="mt-auto text-[11px] text-black/40 dark:text-white/40">
                  ※ 無料 API プランのため、今日から5日先までの日付を選択できます。
                </p>
              </div>
            )}
          </div>

          {weather && <Recommendations weather={weather} />}

          {weather && <PhotographyScores scores={weather.photography} date={weather.date} />}
        </div>
      </main>
    </div>
  );
}
