import { NextRequest, NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { z } from "zod";
import { fallbackRecommendations, type RecommendationInput } from "@/lib/recommendations";

export const dynamic = "force-dynamic";

const recommendationSchema = z.object({
  summary: z.string(),
  recommendations: z
    .array(
      z.object({
        icon: z.string(),
        title: z.string(),
        reason: z.string(),
      })
    )
    .length(3),
});

function buildPrompt(input: RecommendationInput): string {
  return `あなたは天気に詳しいアシスタントです。以下の天気情報をもとに、今日の行動として適した提案を3つ、日本語で作成してください。

都市: ${input.cityName}
日付: ${input.date}
天気: ${input.weatherDescription || "不明"}
気温: ${input.temperatureC ?? "不明"}°C
体感温度: ${input.feelsLikeC ?? "不明"}°C
湿度: ${input.humidityPercent ?? "不明"}%
風速: ${input.windSpeedMs ?? "不明"} m/s
降水確率: ${input.rainProbabilityPercent}%
UV指数: ${input.uvIndex ?? "不明"}
日の出: ${input.sunrise ?? "不明"}
日の入り: ${input.sunset ?? "不明"}

各提案には絵文字1つのicon、10文字前後の短いtitle、具体的な理由を書いたreasonを含めてください。summaryには天気全体を1文で要約してください。`;
}

export async function POST(request: NextRequest) {
  let input: RecommendationInput;
  try {
    input = (await request.json()) as RecommendationInput;
  } catch {
    return NextResponse.json({ error: "リクエストの形式が正しくありません。" }, { status: 400 });
  }

  try {
    const { output } = await generateText({
      model: "anthropic/claude-sonnet-5",
      output: Output.object({ schema: recommendationSchema }),
      prompt: buildPrompt(input),
    });
    return NextResponse.json({ ...output, source: "ai" });
  } catch (err) {
    console.error("AIおすすめ行動の生成に失敗したため、固定ルールの提案にフォールバックします。", err);
    return NextResponse.json(fallbackRecommendations(input));
  }
}
