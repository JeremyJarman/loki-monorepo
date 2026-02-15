'use client';

import { useState, useEffect } from 'react';
import { TimeRange } from '@loki/shared';

interface OpeningHoursInputV2Props {
  value?: {
    monday: TimeRange[];
    tuesday: TimeRange[];
    wednesday: TimeRange[];
    thursday: TimeRange[];
    friday: TimeRange[];
    saturday: TimeRange[];
    sunday: TimeRange[];
  };
  onChange: (hours: {
    monday: TimeRange[];
    tuesday: TimeRange[];
    wednesday: TimeRange[];
    thursday: TimeRange[];
    friday: TimeRange[];
    saturday: TimeRange[];
    sunday: TimeRange[];
  }) => void;
}

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
] as const;

type DayKey = typeof DAYS[number]['key'];

// Generate half-hour intervals for time dropdowns
const generateTimeOptions = (): string[] => {
  const options: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const h = hour.toString().padStart(2, '0');
      const m = minute.toString().padStart(2, '0');
      options.push(`${h}:${m}`);
    }
  }
  return options;
};

const TIME_OPTIONS = generateTimeOptions();

// Format time for display - 24hr notation (HH:mm)
const formatTimeForDisplay = (time: string): string => {
  if (!time) return '00:00';
  return time; // Already HH:mm
};

// Calculate 1 hour before a given time (HH:mm format)
const calculateOneHourBefore = (time: string): string => {
  if (!time) return '00:00';
  const [hours, minutes] = time.split(':');
  let hour = parseInt(hours);
  const min = parseInt(minutes);
  
  // Subtract 1 hour
  hour = hour - 1;
  
  // Handle negative hours (wrap to previous day)
  if (hour < 0) {
    hour = 23;
  }
  
  return `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
};

export default function OpeningHoursInputV2({ value, onChange }: OpeningHoursInputV2Props) {
  const [hours, setHours] = useState<Record<DayKey, TimeRange[]>>(() => {
    if (value) {
      return {
        monday: value.monday || [],
        tuesday: value.tuesday || [],
        wednesday: value.wednesday || [],
        thursday: value.thursday || [],
        friday: value.friday || [],
        saturday: value.saturday || [],
        sunday: value.sunday || [],
      };
    }
    return {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: [],
    };
  });

  const [isOpen, setIsOpen] = useState<Record<DayKey, boolean>>(() => {
    const initial: Record<DayKey, boolean> = {
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false,
    };
    
    if (value) {
      DAYS.forEach(day => {
        initial[day.key] = (value[day.key] && value[day.key].length > 0) || false;
      });
    }
    
    return initial;
  });

  useEffect(() => {
    if (value) {
      setHours({
        monday: value.monday || [],
        tuesday: value.tuesday || [],
        wednesday: value.wednesday || [],
        thursday: value.thursday || [],
        friday: value.friday || [],
        saturday: value.saturday || [],
        sunday: value.sunday || [],
      });
      
      const openStatus: Record<DayKey, boolean> = {
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false,
      };
      
      DAYS.forEach(day => {
        openStatus[day.key] = (value[day.key] && value[day.key].length > 0) || false;
      });
      
      setIsOpen(openStatus);
    }
  }, [value]);

  const toggleDay = (dayKey: DayKey) => {
    const newIsOpen = !isOpen[dayKey];
    setIsOpen(prev => ({ ...prev, [dayKey]: newIsOpen }));
    
    if (newIsOpen) {
      // Opening the day - add a default time range if none exists
      if (hours[dayKey].length === 0) {
        const defaultClose = '17:00';
        const defaultKitchenClose = calculateOneHourBefore(defaultClose);
        const updated = {
          ...hours,
          [dayKey]: [{ open: '09:00', close: defaultClose, kitchenClose: defaultKitchenClose }],
        };
        setHours(updated);
        onChange(updated);
      }
    } else {
      // Closing the day - clear all time ranges
      const updated = {
        ...hours,
        [dayKey]: [],
      };
      setHours(updated);
      onChange(updated);
    }
  };

  const addTimeRange = (dayKey: DayKey) => {
    const lastRange = hours[dayKey][hours[dayKey].length - 1];
    const defaultClose = '17:00';
    const defaultKitchenClose = calculateOneHourBefore(defaultClose);
    const newRange: TimeRange = {
      open: lastRange?.close || '09:00',
      close: defaultClose,
      kitchenClose: defaultKitchenClose,
    };
    const updated = {
      ...hours,
      [dayKey]: [...hours[dayKey], newRange],
    };
    setHours(updated);
    onChange(updated);
  };

  const updateTimeRange = (dayKey: DayKey, index: number, field: 'open' | 'close' | 'kitchenClose', value: string) => {
    const updated = {
      ...hours,
      [dayKey]: hours[dayKey].map((range, i) => {
        if (i === index) {
          const newRange = { ...range, [field]: value };
          // If close time is updated, automatically update kitchen close to 1 hour before (unless user is manually editing kitchen close)
          if (field === 'close') {
            newRange.kitchenClose = calculateOneHourBefore(value);
          }
          return newRange;
        }
        return range;
      }),
    };
    setHours(updated);
    onChange(updated);
  };

  const applySameAsAbove = (fromDayIndex: number) => {
    const sourceDay = DAYS[fromDayIndex];
    const sourceRanges = hours[sourceDay.key] || [];
    const sourceOpen = isOpen[sourceDay.key];
    const updated = { ...hours };
    const updatedIsOpen = { ...isOpen };
    for (let i = fromDayIndex + 1; i < DAYS.length; i++) {
      const dayKey = DAYS[i].key;
      updated[dayKey] = sourceRanges.length > 0 ? [...sourceRanges] : [];
      updatedIsOpen[dayKey] = sourceOpen;
    }
    setHours(updated);
    setIsOpen(updatedIsOpen);
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-text-paragraph mb-4">
        Add time ranges for each day (24hr format). Overnight hours (e.g., 18:00 → 02:00) are represented by close time being earlier than open time.
      </p>
      <div className="flex flex-wrap gap-2 mb-4">
        {DAYS.map((_, i) => (
          <button
            key={DAYS[i].key}
            type="button"
            onClick={() => applySameAsAbove(i)}
            className="text-xs px-3 py-1.5 border border-neutral-light rounded-lg hover:border-primary hover:text-primary transition-colors"
          >
            Same as {DAYS[i].label} →
          </button>
        ))}
      </div>
      <p className="text-xs text-text-paragraph mb-2">Click &quot;Same as [Day] →&quot; to copy that day&apos;s hours to all days below it.</p>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-light">
              <th className="text-left py-3 px-4 font-body font-semibold text-neutral">Day</th>
              <th className="text-left py-3 px-4 font-body font-semibold text-neutral">Open Hour</th>
              <th className="text-left py-3 px-4 font-body font-semibold text-neutral">Close Hour</th>
              <th className="text-left py-3 px-4 font-body font-semibold text-neutral">Kitchen Close</th>
              <th className="text-left py-3 px-4 font-body font-semibold text-neutral">Open</th>
            </tr>
          </thead>
          <tbody>
            {DAYS.map((day) => {
              const dayRanges = hours[day.key] || [];
              const dayIsOpen = isOpen[day.key];
              const defaultClose = '17:00';
              const defaultKitchenClose = calculateOneHourBefore(defaultClose);
              const firstRange = dayRanges[0] || { open: '09:00', close: defaultClose, kitchenClose: defaultKitchenClose };
              
              return (
                <tr key={day.key} className="border-b border-neutral-light">
                  <td className="py-4 px-4 font-body text-neutral">{day.label}</td>
                  <td className="py-4 px-4">
                    <select
                      value={firstRange.open || '09:00'}
                      onChange={(e) => {
                        if (dayRanges.length === 0) {
                          addTimeRange(day.key);
                        }
                        updateTimeRange(day.key, 0, 'open', e.target.value);
                      }}
                      disabled={!dayIsOpen}
                      className="w-full px-3 py-2 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary transition-colors font-body text-neutral disabled:bg-neutral-light disabled:cursor-not-allowed"
                    >
                      {TIME_OPTIONS.map(time => (
                        <option key={time} value={time}>
                          {formatTimeForDisplay(time)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-4 px-4">
                    <select
                      value={firstRange.close || '17:00'}
                      onChange={(e) => {
                        if (dayRanges.length === 0) {
                          addTimeRange(day.key);
                        }
                        updateTimeRange(day.key, 0, 'close', e.target.value);
                      }}
                      disabled={!dayIsOpen}
                      className="w-full px-3 py-2 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary transition-colors font-body text-neutral disabled:bg-neutral-light disabled:cursor-not-allowed"
                    >
                      {TIME_OPTIONS.map(time => (
                        <option key={time} value={time}>
                          {formatTimeForDisplay(time)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-4 px-4">
                    <select
                      value={firstRange.kitchenClose || calculateOneHourBefore(firstRange.close || '17:00')}
                      onChange={(e) => {
                        if (dayRanges.length === 0) {
                          addTimeRange(day.key);
                        }
                        updateTimeRange(day.key, 0, 'kitchenClose', e.target.value);
                      }}
                      disabled={!dayIsOpen}
                      className="w-full px-3 py-2 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary transition-colors font-body text-neutral disabled:bg-neutral-light disabled:cursor-not-allowed"
                    >
                      {TIME_OPTIONS.map(time => (
                        <option key={time} value={time}>
                          {formatTimeForDisplay(time)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => addTimeRange(day.key)}
                        disabled={!dayIsOpen}
                        className="w-8 h-8 flex items-center justify-center border-2 border-neutral-light rounded-lg hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-neutral hover:text-primary"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleDay(day.key)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                          dayIsOpen ? 'bg-primary' : 'bg-neutral-light'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            dayIsOpen ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {Object.values(hours).some(dayRanges => dayRanges.length > 1) && (
        <div className="mt-6 p-4 bg-neutral-light/50 rounded-lg">
          <p className="text-sm text-text-paragraph mb-3">
            <strong>Multiple time ranges:</strong> Some days have multiple time ranges. Use the "+" button to add additional ranges.
          </p>
          {DAYS.map((day) => {
            const dayRanges = hours[day.key] || [];
            if (dayRanges.length <= 1) return null;
            
            return (
              <div key={day.key} className="mb-4 last:mb-0">
                <p className="text-sm font-semibold text-neutral mb-2">{day.label} - Additional Ranges:</p>
                {dayRanges.slice(1).map((range, index) => (
                  <div key={index} className="flex items-center gap-2 mb-2">
                    <select
                      value={range.open}
                      onChange={(e) => updateTimeRange(day.key, index + 1, 'open', e.target.value)}
                      className="px-3 py-2 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary transition-colors font-body text-neutral"
                    >
                      {TIME_OPTIONS.map(time => (
                        <option key={time} value={time}>
                          {formatTimeForDisplay(time)}
                        </option>
                      ))}
                    </select>
                    <span className="text-text-paragraph">to</span>
                    <select
                      value={range.close}
                      onChange={(e) => updateTimeRange(day.key, index + 1, 'close', e.target.value)}
                      className="px-3 py-2 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary transition-colors font-body text-neutral"
                    >
                      {TIME_OPTIONS.map(time => (
                        <option key={time} value={time}>
                          {formatTimeForDisplay(time)}
                        </option>
                      ))}
                    </select>
                    <select
                      value={range.kitchenClose || calculateOneHourBefore(range.close || '17:00')}
                      onChange={(e) => updateTimeRange(day.key, index + 1, 'kitchenClose', e.target.value)}
                      className="px-3 py-2 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary transition-colors font-body text-neutral"
                    >
                      {TIME_OPTIONS.map(time => (
                        <option key={time} value={time}>
                          {formatTimeForDisplay(time)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = {
                          ...hours,
                          [day.key]: hours[day.key].filter((_, i) => i !== index + 1),
                        };
                        setHours(updated);
                        onChange(updated);
                      }}
                      className="px-3 py-2 text-sm bg-secondary text-white rounded-lg hover:bg-secondary-dark font-semibold transition-all duration-200"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
