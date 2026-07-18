import type { PhotoCondition, PhotographyScores as PhotographyScoresType } from "@/lib/photography";

type PhotographyScoresProps = {
  scores: PhotographyScoresType;
  date: string;
};

const ITEMS: Array<{ key: keyof PhotographyScoresType; icon: string; title: string }> = [
  { key: "sunset", icon: "🌇", title: "夕日撮影指数" },
  { key: "stars", icon: "🌌", title: "星空撮影指数" },
  { key: "photoWalk", icon: "🚶", title: "街歩き撮影指数" },
];

function barColor(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-sky-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-rose-500";
}

function ScoreCard({ icon, title, condition }: { icon: string; title: string; condition: PhotoCondition }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-black/10 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
          {icon} {title}
        </span>
        <span className="text-base font-bold text-slate-800 dark:text-slate-100">
          {condition.score}
          <span className="text-xs font-normal text-black/50 dark:text-white/50">/100</span>
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={condition.score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={title}
        className="h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10"
      >
        <div
          className={`h-full rounded-full ${barColor(condition.score)}`}
          style={{ width: `${condition.score}%` }}
        />
      </div>
      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{condition.label}</p>
      <p className="text-xs text-black/60 dark:text-white/60">{condition.reason}</p>
    </div>
  );
}

export default function PhotographyScores({ scores, date }: PhotographyScoresProps) {
  return (
    <section className="flex h-full w-full flex-col rounded-xl border border-black/10 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
          今日の撮影指数
        </h2>
        <span className="text-xs text-black/50 dark:text-white/50">{date}</span>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-y-auto">
        {ITEMS.map((item) => (
          <ScoreCard key={item.key} icon={item.icon} title={item.title} condition={scores[item.key]} />
        ))}
      </div>
    </section>
  );
}
