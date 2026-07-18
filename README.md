# 天気予報アプリ

OpenWeatherMap API と連携した天気予報 Web アプリです。都市名検索または現在地から、気温・天気・湿度・降水確率を表示し、カレンダーで日付を選んで予報を切り替えられます（無料 API プランのため今日から5日先まで）。

## セットアップ

1. [OpenWeatherMap](https://openweathermap.org/api) で無料アカウントを作成し、API キーを取得する
   - 使用エンドポイント: Geocoding API / Current Weather Data / 5 Day 3 Hour Forecast（すべて無料枠）
2. `.env.local.example` を `.env.local` にコピーし、取得した API キーを設定する

   ```bash
   cp .env.local.example .env.local
   ```

3. 依存関係をインストールして開発サーバーを起動する

   ```bash
   npm install
   npm run dev
   ```

4. http://localhost:3000 を開く

## 環境変数

| 変数名 | 説明 |
| --- | --- |
| `OPENWEATHER_API_KEY` | OpenWeatherMap の API キー。サーバー側 (Route Handler) でのみ使用し、クライアントには公開しない。 |
| `AI_GATEWAY_API_KEY` | AIおすすめ行動機能で使う Vercel AI Gateway の API キー。未設定の場合は天気条件から作成した固定ルールの提案にフォールバックする。 |

## デプロイ (Vercel)

1. GitHub にリポジトリを push
2. Vercel でプロジェクトをインポート
3. Vercel の Project Settings > Environment Variables に `OPENWEATHER_API_KEY` を設定
4. デプロイ

## 技術構成

- Next.js (App Router) + TypeScript
- Tailwind CSS
- `/api/weather` Route Handler が OpenWeatherMap API キーをサーバー側で保持し、クライアントに直接キーを渡さない構成
