"use client";

import { useState } from "react";

type CalendarProps = {
  selectedDate: string; // YYYY-MM-DD
  availableDates: string[]; // 予報が取得できる日付 (YYYY-MM-DD) の一覧
  onSelect: (date: string) => void;
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function toDateKey(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function Calendar({ selectedDate, availableDates, onSelect }: CalendarProps) {
  const availableSet = new Set(availableDates);
  const initial = selectedDate ? new Date(selectedDate) : new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth()); // 0-indexed

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: Array<{ day: number; key: string } | null> = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, key: toDateKey(viewYear, viewMonth, d) });
  }

  const todayKey = toDateKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  function goPrevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goNextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-black/10 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={goPrevMonth}
          aria-label="前の月"
          className="rounded-md px-2 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10"
        >
          ←
        </button>
        <span className="text-sm font-semibold">
          {viewYear}年 {viewMonth + 1}月
        </span>
        <button
          type="button"
          onClick={goNextMonth}
          aria-label="次の月"
          className="rounded-md px-2 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10"
        >
          →
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-black/50 dark:text-white/50">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, idx) => {
          if (!cell) return <div key={`empty-${idx}`} />;
          const isAvailable = availableSet.has(cell.key);
          const isSelected = cell.key === selectedDate;
          const isToday = cell.key === todayKey;
          return (
            <button
              key={cell.key}
              type="button"
              disabled={!isAvailable}
              onClick={() => onSelect(cell.key)}
              title={isAvailable ? undefined : "無料プランでは今日から5日先までの予報のみ表示できます"}
              className={[
                "aspect-square rounded-md text-sm transition-colors",
                isAvailable
                  ? "cursor-pointer hover:bg-sky-500/20"
                  : "cursor-not-allowed text-black/25 dark:text-white/20",
                isSelected ? "bg-sky-500 text-white hover:bg-sky-500" : "",
                isToday && !isSelected ? "font-bold text-sky-600 dark:text-sky-400" : "",
              ].join(" ")}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-black/50 dark:text-white/50">
        ※ 無料 API プランのため、選択できるのは今日から5日先までです。
      </p>
    </div>
  );
}
