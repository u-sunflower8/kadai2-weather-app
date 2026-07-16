// OpenWeatherMap の型とデータ集計ロジック（無料の Geocoding / Current Weather / 5 Day-3 Hour Forecast API を使用）

export type GeoResult = {
  name: string;
  local_names?: Record<string, string>;
  lat: number;
  lon: number;
  country: string;
  state?: string;
};

export type OwmWeatherDesc = {
  id: number;
  main: string;
  description: string;
  icon: string;
};

export type OwmCurrentResponse = {
  weather: OwmWeatherDesc[];
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
  };
  name: string;
  sys: { country?: string };
  timezone: number;
};

export type OwmForecastListItem = {
  dt: number;
  main: {
    temp: number;
    humidity: number;
  };
  weather: OwmWeatherDesc[];
  pop?: number;
  dt_txt: string;
};

export type OwmForecastResponse = {
  list: OwmForecastListItem[];
  city: {
    name: string;
    country: string;
    timezone: number;
  };
};

export type DaySummary = {
  date: string; // YYYY-MM-DD (現地時間)
  tempMin: number;
  tempMax: number;
  tempAvg: number;
  humidityAvg: number;
  pop: number; // 0-100 (%)
  weatherMain: string;
  weatherDescription: string;
  icon: string;
};

export type WeatherApiResponse = {
  location: {
    name: string;
    country: string;
    lat: number;
    lon: number;
  };
  date: string;
  isToday: boolean;
  current: {
    temp: number;
    feelsLike: number;
    humidity: number;
    weatherMain: string;
    weatherDescription: string;
    icon: string;
  } | null;
  day: DaySummary | null;
  availableDates: string[];
};

/** UNIX 秒とタイムゾーンオフセット（秒）から現地日付文字列 (YYYY-MM-DD) を求める */
export function localDateString(unixSeconds: number, tzOffsetSeconds: number): string {
  const shifted = new Date((unixSeconds + tzOffsetSeconds) * 1000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function localHour(unixSeconds: number, tzOffsetSeconds: number): number {
  const shifted = new Date((unixSeconds + tzOffsetSeconds) * 1000);
  return shifted.getUTCHours();
}

/** 3時間ごとの予報リストを現地日付ごとにグループ化する */
export function bucketByLocalDate(
  list: OwmForecastListItem[],
  tzOffsetSeconds: number
): Map<string, OwmForecastListItem[]> {
  const map = new Map<string, OwmForecastListItem[]>();
  for (const item of list) {
    const key = localDateString(item.dt, tzOffsetSeconds);
    const bucket = map.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return map;
}

/** 1日分の3時間予報エントリを日次サマリに集計する */
export function aggregateDay(
  date: string,
  entries: OwmForecastListItem[],
  tzOffsetSeconds: number
): DaySummary {
  const temps = entries.map((e) => e.main.temp);
  const humidities = entries.map((e) => e.main.humidity);
  const pops = entries.map((e) => e.pop ?? 0);

  // 正午に最も近いエントリを「代表天気」として採用する
  const representative = entries.reduce((best, e) => {
    const bestDiff = Math.abs(localHour(best.dt, tzOffsetSeconds) - 12);
    const eDiff = Math.abs(localHour(e.dt, tzOffsetSeconds) - 12);
    return eDiff < bestDiff ? e : best;
  }, entries[0]);

  const avg = (nums: number[]) => nums.reduce((a, b) => a + b, 0) / nums.length;

  return {
    date,
    tempMin: Math.min(...temps),
    tempMax: Math.max(...temps),
    tempAvg: avg(temps),
    humidityAvg: avg(humidities),
    pop: Math.round(Math.max(...pops) * 100),
    weatherMain: representative.weather[0]?.main ?? "",
    weatherDescription: representative.weather[0]?.description ?? "",
    icon: representative.weather[0]?.icon ?? "01d",
  };
}
