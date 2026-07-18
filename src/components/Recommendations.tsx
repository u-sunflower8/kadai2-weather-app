"use client";

import { useEffect, useRef, useState } from "react";
import {
  buildRecommendationInput,
  fallbackRecommendations,
  type RecommendationsResult,
} from "@/lib/recommendations";
import type { WeatherApiResponse } from "@/lib/weather";

type RecommendationsProps = {
  weather: WeatherApiResponse;
};

export default function Recommendations({ weather }: RecommendationsProps) {
  const [result, setResult] = useState<RecommendationsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const lastSignature = useRef<string | null>(null);

  useEffect(() => {
    const input = buildRecommendationInput(weather);
    const signature = JSON.stringify(input);
    // 天気データの中身が変わっていない場合は再度AIを呼び出さない
    if (signature === lastSignature.current) return;
    lastSignature.current = signature;

    setLoading(true);

    (async () => {
      let data: RecommendationsResult;
      try {
        const res = await fetch("/api/recommendations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (!res.ok) throw new Error("おすすめ行動の取得に失敗しました。");
        data = (await res.json()) as RecommendationsResult;
      } catch {
        data = fallbackRecommendations(input);
      }
      // この間に天気データがさらに更新されていた場合、古い結果は反映しない
      if (lastSignature.current === signature) {
        setResult(data);
        setLoading(false);
      }
    })();
  }, [weather]);

  return (
    <section className="flex h-full w-full flex-col rounded-xl border border-black/10 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
      <h2 className="mb-3 text-base font-semibold text-slate-800 dark:text-slate-100">
        今日のおすすめ
      </h2>

      {loading && (
        <p className="text-sm text-black/60 dark:text-white/60">AIが提案を考えています...</p>
      )}

      {!loading && result && (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
          <p className="text-sm text-black/70 dark:text-white/70">{result.summary}</p>
          <div className="grid grid-cols-1 gap-2">
            {result.recommendations.map((rec, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-lg border border-black/10 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5"
              >
                <span className="text-xl leading-none">{rec.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {rec.title}
                  </p>
                  <p className="text-xs text-black/60 dark:text-white/60">{rec.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
