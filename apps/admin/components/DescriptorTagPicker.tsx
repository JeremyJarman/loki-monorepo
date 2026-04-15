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
            className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-xs font-semibold bg-neutral-light/50 text-neutral border border-neutral-light"
          >
            {d}
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="p-0.5 rounded-full hover:bg-neutral-light/80 text-text-paragraph"
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
            atCap
              ? `Maximum ${ARTIST_MAX_DESCRIPTORS} styles`
              : 'Search DJ, Guitarist, Producer…'
          }
          autoComplete="off"
          role="combobox"
          aria-expanded={canShowList}
          aria-controls={listId}
          aria-autocomplete="list"
          className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary text-sm disabled:opacity-60"
        />

        {canShowList && (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-30 mt-1 w-full max-h-48 overflow-auto rounded-lg border-2 border-neutral-light bg-white shadow-lg py-1"
          >
            {filtered.map((d, i) => (
              <li key={d} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={i === activeIndex}
                  className={`w-full text-left px-3 py-2 text-sm ${
                    i === activeIndex ? 'bg-primary/10 text-primary' : 'text-neutral hover:bg-neutral-light/40'
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
        Up to {ARTIST_MAX_DESCRIPTORS} — role or performance style (not genre). Fixed list only.
      </p>
    </div>
  );
}
