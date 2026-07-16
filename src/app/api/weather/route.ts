import { NextRequest, NextResponse } from "next/server";
import {
  aggregateDay,
  bucketByLocalDate,
  type GeoResult,
  type OwmCurrentResponse,
  type OwmForecastResponse,
  type WeatherApiResponse,
} from "@/lib/weather";

export const dynamic = "force-dynamic";

const OWM_BASE = "https://api.openweathermap.org";

async function fetchOwmJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    if (res.status === 401) {
      throw new ApiError(
        "OpenWeatherMap の API キーが無効です。環境変数 OPENWEATHER_API_KEY を確認してください。",
        500
      );
    }
    if (res.status === 404) {
      throw new ApiError("指定された都市・地点が見つかりませんでした。", 404);
    }
    throw new ApiError(`天気情報の取得に失敗しました (status: ${res.status})`, 502);
  }
  return res.json() as Promise<T>;
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "サーバーに OPENWEATHER_API_KEY が設定されていません。" },
      { status: 500 }
    );
  }

  const { searchParams } = request.nextUrl;
  const city = searchParams.get("city")?.trim();
  const latParam = searchParams.get("lat");
  const lonParam = searchParams.get("lon");
  const requestedDate = searchParams.get("date") ?? undefined;

  try {
    let latitude: number;
    let longitude: number;
    let locationName: string;
    let country: string;

    if (latParam && lonParam) {
      latitude = parseFloat(latParam);
      longitude = parseFloat(lonParam);
      if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        throw new ApiError("緯度・経度の形式が正しくありません。", 400);
      }
      const reverse = await fetchOwmJson<GeoResult[]>(
        `${OWM_BASE}/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${apiKey}`
      );
      locationName = reverse[0]?.local_names?.ja ?? reverse[0]?.name ?? "現在地";
      country = reverse[0]?.country ?? "";
    } else if (city) {
      const geo = await fetchOwmJson<GeoResult[]>(
        `${OWM_BASE}/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=5&appid=${apiKey}`
      );
      if (!geo.length) {
        throw new ApiError(`都市が見つかりませんでした: ${city}`, 404);
      }
      // OpenWeatherMap のジオコーディングは関連度順とは限らないため、
      // 入力と完全一致する候補があればそれを優先する（例: "Osaka" が Orsk(ロシア) より先に来ることがある）
      const normalized = city.toLowerCase();
      const best =
        geo.find(
          (g) =>
            g.name.toLowerCase() === normalized ||
            Object.values(g.local_names ?? {}).some((n) => n.toLowerCase() === normalized)
        ) ?? geo[0];
      latitude = best.lat;
      longitude = best.lon;
      locationName = best.local_names?.ja ?? best.name;
      country = best.country;
    } else {
      throw new ApiError("都市名 (city) または緯度経度 (lat, lon) を指定してください。", 400);
    }

    const [current, forecast] = await Promise.all([
      fetchOwmJson<OwmCurrentResponse>(
        `${OWM_BASE}/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&lang=ja&appid=${apiKey}`
      ),
      fetchOwmJson<OwmForecastResponse>(
        `${OWM_BASE}/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=metric&lang=ja&appid=${apiKey}`
      ),
    ]);

    const tzOffset = forecast.city.timezone;
    const buckets = bucketByLocalDate(forecast.list, tzOffset);
    const availableDates = Array.from(buckets.keys()).sort();
    const todayDate = availableDates[0];
    const targetDate = requestedDate ?? todayDate;

    const entries = buckets.get(targetDate);
    const day = entries ? aggregateDay(targetDate, entries, tzOffset) : null;

    const isToday = targetDate === todayDate;

    const payload: WeatherApiResponse = {
      location: {
        name: locationName,
        country,
        lat: latitude,
        lon: longitude,
      },
      date: targetDate,
      isToday,
      current: isToday
        ? {
            temp: current.main.temp,
            feelsLike: current.main.feels_like,
            humidity: current.main.humidity,
            weatherMain: current.weather[0]?.main ?? "",
            weatherDescription: current.weather[0]?.description ?? "",
            icon: current.weather[0]?.icon ?? "01d",
          }
        : null,
      day,
      availableDates,
    };

    return NextResponse.json(payload);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "予期しないエラーが発生しました。" },
      { status: 500 }
    );
  }
}
