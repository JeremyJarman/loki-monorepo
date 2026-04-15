'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { EventPreviewItem } from '@/lib/events';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Group events by local calendar day (start time). */
export function groupEventsByLocalDay(events: EventPreviewItem[]): Map<string, EventPreviewItem[]> {
  const map = new Map<string, EventPreviewItem[]>();
  for (const e of events) {
    const key = localDateKey(e.startAt);
    const arr = map.get(key);
    if (arr) arr.push(e);
    else map.set(key, [e]);
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  }
  return map;
}

function monthMatrix(year: number, month: number): { date: Date; inMonth: boolean }[][] {
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const cells: { date: Date; inMonth: boolean }[] = [];
  const prevLast = new Date(year, month, 0).getDate();
  for (let i = 0; i < startPad; i++) {
    const d = prevLast - startPad + i + 1;
    cells.push({ date: new Date(year, month - 1, d), inMonth: false });
  }
  for (let d = 1; d <= lastDay; d++) {
    cells.push({ date: new Date(year, month, d), inMonth: true });
  }
  const remainder = cells.length % 7;
  const trail = remainder === 0 ? 0 : 7 - remainder;
  for (let i = 1; i <= trail; i++) {
    cells.push({ date: new Date(year, month + 1, i), inMonth: false });
  }
  const rows: { date: Date; inMonth: boolean }[][] = [];
  for (let r = 0; r < cells.length; r += 7) {
    rows.push(cells.slice(r, r + 7));
  }
  return rows;
}

export function DiscoverEventCalendar({
  events,
  selectedDateKey,
  onSelectDateKey,
  focusMonth,
  onFocusMonthChange,
}: {
  events: EventPreviewItem[];
  selectedDateKey: string | null;
  onSelectDateKey: (key: string | null) => void;
  focusMonth: { year: number; month: number };
  onFocusMonthChange: (y: number, m: number) => void;
}) {
  const byDay = useMemo(() => groupEventsByLocalDay(events), [events]);
  const todayKey = localDateKey(new Date());
  const { year, month } = focusMonth;
  const matrix = useMemo(() => monthMatrix(year, month), [year, month]);
  const monthLabel = new Date(year, month, 1).toLocaleString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const goPrev = () => {
    const d = new Date(year, month - 1, 1);
    onFocusMonthChange(d.getFullYear(), d.getMonth());
  };
  const goNext = () => {
    const d = new Date(year, month + 1, 1);
    onFocusMonthChange(d.getFullYear(), d.getMonth());
  };
  const goToday = () => {
    const n = new Date();
    onFocusMonthChange(n.getFullYear(), n.getMonth());
    onSelectDateKey(todayKey);
  };

  return (
    <div className="rounded-xl border border-neutral-light dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-3 border-b border-neutral-light dark:border-neutral-700 bg-neutral-50/80 dark:bg-neutral-800/50">
        <button
          type="button"
          onClick={goPrev}
          className="p-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/80 dark:hover:bg-neutral-700 transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center min-w-0">
          <span className="font-heading font-bold text-lg text-neutral dark:text-neutral-100 truncate">
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={goToday}
            className="mt-0.5 text-xs font-body font-semibold text-primary hover:underline"
          >
            Today
          </button>
        </div>
        <button
          type="button"
          onClick={goNext}
          className="p-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/80 dark:hover:bg-neutral-700 transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px bg-neutral-200 dark:bg-neutral-700 border-b border-neutral-light dark:border-neutral-700">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="bg-neutral-100 dark:bg-neutral-800 px-1 py-2 text-center text-[11px] font-body font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-neutral-200 dark:bg-neutral-700">
        {matrix.flatMap((row, ri) =>
          row.map(({ date, inMonth }, ci) => {
            const key = localDateKey(date);
            const dayEvents = byDay.get(key) ?? [];
            const count = dayEvents.length;
            const isToday = key === todayKey;
            const isSelected = selectedDateKey === key;
            return (
              <button
                key={`${ri}-${ci}`}
                type="button"
                onClick={() => {
                  if (count > 0) onSelectDateKey(key);
                  else onSelectDateKey(isSelected ? null : key);
                }}
                className={`min-h-[4.5rem] sm:min-h-[5.25rem] p-1 sm:p-1.5 text-left align-top transition-colors flex flex-col gap-0.5 ${
                  inMonth
                    ? 'bg-white dark:bg-neutral-900'
                    : 'bg-neutral-50/90 dark:bg-neutral-900/60'
                } ${
                  isSelected
                    ? 'ring-2 ring-inset ring-primary z-[1]'
                    : 'hover:bg-primary/[0.06] dark:hover:bg-primary/10'
                } ${!inMonth ? 'opacity-60' : ''}`}
              >
                <span
                  className={`text-xs font-body font-semibold shrink-0 ${
                    isToday
                      ? 'text-primary'
                      : inMonth
                        ? 'text-neutral dark:text-neutral-200'
                        : 'text-neutral-400 dark:text-neutral-500'
                  }`}
                >
                  {isToday ? (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-on-primary text-[11px]">
                      {date.getDate()}
                    </span>
                  ) : (
                    date.getDate()
                  )}
                </span>
                {count > 0 && inMonth && (
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <span
                        key={ev.instanceId}
                        className="block truncate text-[10px] sm:text-[11px] leading-tight font-body text-text-paragraph dark:text-neutral-400 pl-0.5 border-l-2 border-primary/70"
                        title={`${ev.title} · ${ev.venueName}`}
                      >
                        {ev.title}
                      </span>
                    ))}
                    {count > 3 && (
                      <span className="text-[10px] font-body font-medium text-primary pl-0.5">
                        +{count - 3} more
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>

      {events.length === 0 && (
        <p className="px-4 py-3 text-sm font-body text-text-paragraph dark:text-neutral-400 border-t border-neutral-light dark:border-neutral-700">
          No events in the current filter. Try &quot;All upcoming&quot; or clear search.
        </p>
      )}
    </div>
  );
}

/** Pick a sensible initial month from events (first event month), or today. */
export function initialFocusMonthFromEvents(events: EventPreviewItem[]): { year: number; month: number } {
  if (events.length === 0) {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  }
  const sorted = [...events].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  const d = sorted[0]!.startAt;
  return { year: d.getFullYear(), month: d.getMonth() };
}
