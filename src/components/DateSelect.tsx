"use client";

type DateSelectProps = {
  selectedDate: string; // YYYY-MM-DD
  availableDates: string[]; // 予報が取得できる日付 (YYYY-MM-DD) の一覧
  onSelect: (date: string) => void;
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function formatDateLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${m}/${d} (${WEEKDAYS[date.getDay()]})`;
}

export default function DateSelect({ selectedDate, availableDates, onSelect }: DateSelectProps) {
  return (
    <select
      value={selectedDate}
      onChange={(e) => onSelect(e.target.value)}
      aria-label="表示する日付"
      className="rounded-md border border-black/10 bg-white px-2 py-1 text-sm text-slate-700 shadow-sm outline-none focus:border-sky-500 dark:border-white/10 dark:bg-slate-800 dark:text-white"
    >
      {availableDates.map((d) => (
        <option key={d} value={d}>
          {formatDateLabel(d)}
        </option>
      ))}
    </select>
  );
}
