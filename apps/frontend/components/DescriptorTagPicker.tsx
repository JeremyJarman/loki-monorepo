'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ARTIST_DESCRIPTOR_OPTIONS, ARTIST_MAX_DESCRIPTORS } from '@loki/shared';

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  id?: string;
};

export function DescriptorTagPicker({ value, onChange, id: idProp }: Props) {
  const reactId = useId();
  const baseId = idProp ?? `descriptor-picker-${reactId}`;
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const atCap = value.length >= ARTIST_MAX_DESCRIPTORS;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const taken = new Set(value.map((v) => v.toLowerCase()));
    return ARTIST_DESCRIPTOR_OPTIONS.filter((d) => {
      if (taken.has(d.toLowerCase())) return false;
      if (!q) return true;
      return d.toLowerCase().includes(q);
    });
  }, [query, value]);

  const addLabel = useCallback(
    (canonical: string) => {
      if (value.length >= ARTIST_MAX_DESCRIPTORS) return;
      const lower = canonical.toLowerCase();
      if (value.some((v) => v.toLowerCase() === lower)) return;
      onChange([...value, canonical]);
      setQuery('');
      setOpen(false);
      setActiveIndex(0);
    },
    [value, onChange]
  );

  const removeAt = useCallback(
    (index: number) => {
      onChange(value.filter((_, i) => i !== index));
    },
    [value, onChange]
  );

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  const listId = `${baseId}-list`;
  const canShowList = open && !atCap && filtered.length > 0;

  return (
    <div ref={containerRef} className="space-y-2">
      <div className="flex flex-wrap gap-2 min-h-[2rem]">
        {value.map((d, i) => (
          <span
            key={`${d}-${i}`}
            className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-xs font-body font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral dark:text-neutral-200 border border-neutral-200 dark:border-neutral-600"
          >
            {d}
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="p-0.5 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400"
              aria-label={`Remove ${d}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <div className="relative">
        <input
          id={`${baseId}-input`}
          type="text"
          value={query}
          disabled={atCap}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false);
              return;
            }
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setOpen(true);
              setActiveIndex((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
              return;
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActiveIndex((i) => Math.max(i - 1, 0));
              return;
            }
            if (e.key === 'Enter') {
              e.preventDefault();
              if (filtered.length > 0 && open) {
                const pick = filtered[activeIndex] ?? filtered[0];
                if (pick) addLabel(pick);
              }
            }
          }}
          placeholder={
            atCap ? `Maximum ${ARTIST_MAX_DESCRIPTORS} styles` : 'Search DJ, Guitarist, Producer…'
          }
          autoComplete="off"
          role="combobox"
          aria-expanded={canShowList}
          aria-controls={listId}
          aria-autocomplete="list"
          className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 text-sm font-body text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 bg-white dark:bg-neutral-900 disabled:opacity-60"
        />

        {canShowList && (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-30 mt-1 w-full max-h-48 overflow-auto rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 shadow-lg py-1"
          >
            {filtered.map((d, i) => (
              <li key={d} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={i === activeIndex}
                  className={`w-full text-left px-3 py-2 text-sm font-body ${
                    i === activeIndex
                      ? 'bg-primary/15 text-primary dark:text-emerald-300'
                      : 'text-neutral dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                  }`}
                  onMouseEnter={() => setActiveIndex(i)}
                  onMouseDown={(ev) => ev.preventDefault()}
                  onClick={() => addLabel(d)}
                >
                  {d}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-xs text-text-paragraph">
        Up to {ARTIST_MAX_DESCRIPTORS} — your role or how you perform (separate from music genre).
      </p>
    </div>
  );
}
