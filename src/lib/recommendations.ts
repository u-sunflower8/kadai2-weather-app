// AIおすすめ行動の入力データ整形と、AI呼び出し失敗時のルールベース代替ロジック

import type { WeatherApiResponse } from "@/lib/weather";

export type RecommendationInput = {
  cityName: string;
  date: string;
  weatherDescription: string;
  temperatureC: number | null;
  feelsLikeC: number | null;
  humidityPercent: number | null;
  windSpeedMs: number | null;
  rainProbabilityPercent: number;
  uvIndex: number | null;
  sunrise: string | null;
  sunset: string | null;
};

export type ActionRecommendation = {
  icon: string;
  title: string;
  reason: string;
};

export type RecommendationsResult = {
  summary: string;
  recommendations: ActionRecommendation[];
  source: "ai" | "fallback";
};

/** 天気APIレスポンスから、おすすめ行動生成に必要な入力データを取り出す */
export function buildRecommendationInput(weather: WeatherApiResponse): RecommendationInput {
  return {
    cityName: weather.location.country
      ? `${weather.location.name}, ${weather.location.country}`
      : weather.location.name,
    date: weather.date,
    weatherDescription: weather.current?.weatherDescription ?? weather.day?.weatherDescription ?? "",
    temperatureC: weather.current?.temp ?? weather.day?.tempAvg ?? null,
    feelsLikeC: weather.current?.feelsLike ?? weather.day?.feelsLikeAvg ?? null,
    humidityPercent: weather.current?.humidity ?? weather.day?.humidityAvg ?? null,
    windSpeedMs: weather.current?.windSpeed ?? weather.day?.windSpeedAvg ?? null,
    rainProbabilityPercent: weather.day?.pop ?? 0,
    uvIndex: weather.uvIndex,
    sunrise: weather.sunrise,
    sunset: weather.sunset,
  };
}

function round(value: number | null): number | null {
  return typeof value === "number" ? Math.round(value) : null;
}

function rainRecommendation(input: RecommendationInput): ActionRecommendation {
  const pop = input.rainProbabilityPercent;
  if (pop >= 50) {
    return {
      icon: "☔",
      title: "傘を忘れずに",
      reason: `降水確率${pop}%のため、傘や防水シューズがあると安心です。`,
    };
  }
  if (pop >= 20) {
    return {
      icon: "🌂",
      title: "折りたたみ傘があると安心",
      reason: `降水確率${pop}%で、にわか雨の可能性があります。`,
    };
  }
  return {
    icon: "☀️",
    title: "屋外活動日和",
    reason: `降水確率${pop}%と低く、屋外での活動に向いています。`,
  };
}

function temperatureRecommendation(input: RecommendationInput): ActionRecommendation {
  const temp = round(input.temperatureC);
  const feels = round(input.feelsLikeC);
  if (temp === null) {
    return {
      icon: "🌡️",
      title: "服装は天気予報を確認",
      reason: "気温データが取得できなかったため、最新の予報を確認してから服装を選びましょう。",
    };
  }
  if (temp >= 30) {
    return {
      icon: "🥵",
      title: "こまめな水分補給を",
      reason: `気温${temp}°C${feels !== null ? `・体感${feels}°C` : ""}のため、熱中症に注意しましょう。`,
    };
  }
  if (temp <= 5) {
    return {
      icon: "🧥",
      title: "暖かい服装で",
      reason: `気温${temp}°Cと冷え込むため、厚手の上着がおすすめです。`,
    };
  }
  return {
    icon: "🚶",
    title: "お出かけ日和",
    reason: `気温${temp}°Cで過ごしやすく、散歩や外出に適しています。`,
  };
}

function conditionRecommendation(input: RecommendationInput): ActionRecommendation {
  const uv = input.uvIndex;
  const wind = input.windSpeedMs;
  const humidity = input.humidityPercent;

  if (typeof uv === "number" && uv >= 7) {
    return {
      icon: "🕶️",
      title: "UV対策を",
      reason: `UV指数${uv}と高めなので、日焼け止めや帽子で対策しましょう。`,
    };
  }
  if (typeof wind === "number" && wind >= 8) {
    return {
      icon: "💨",
      title: "風対策を",
      reason: `風速${wind.toFixed(1)}m/sとやや強めなので、髪や傘の扱いに注意しましょう。`,
    };
  }
  if (typeof humidity === "number" && humidity >= 80) {
    return {
      icon: "💧",
      title: "蒸し暑さ対策を",
      reason: `湿度${Math.round(humidity)}%と高めなので、通気性の良い服装がおすすめです。`,
    };
  }
  return {
    icon: "📸",
    title: "写真撮影におすすめ",
    reason: "視界が良く、街歩きや撮影にも向いた一日です。",
  };
}

function buildSummary(input: RecommendationInput): string {
  const temp = round(input.temperatureC);
  const tempPart = temp !== null ? `気温${temp}°C` : "気温情報なし";
  const weatherPart = input.weatherDescription || "予報データなし";
  return `${input.cityName}は${weatherPart}・${tempPart}の見込みです。`;
}

/** AI呼び出しが失敗した場合に使う、天気条件からの固定ルールによるおすすめ行動 */
export function fallbackRecommendations(input: RecommendationInput): RecommendationsResult {
  return {
    summary: buildSummary(input),
    recommendations: [
      rainRecommendation(input),
      temperatureRecommendation(input),
      conditionRecommendation(input),
    ],
    source: "fallback",
  };
}
