'use client';

import { useState, useEffect } from 'react';

interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

interface OpeningHoursInputProps {
  value?: Record<string, DayHours>;
  onChange: (hours: Record<string, DayHours>) => void;
  publicHolidayRule?: string;
  onPublicHolidayRuleChange?: (rule: string) => void;
}

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

export default function OpeningHoursInput({ 
  value, 
  onChange, 
  publicHolidayRule: initialPublicHolidayRule,
  onPublicHolidayRuleChange 
}: OpeningHoursInputProps) {
  // Initialize with all days set to 9 AM until midnight
  const getDefaultHours = (): Record<string, DayHours> => {
    const initial: Record<string, DayHours> = {};
    DAYS.forEach(day => {
      initial[day.key] = { open: '09:00', close: '00:00', closed: false };
    });
    return initial;
  };

  const [hours, setHours] = useState<Record<string, DayHours>>(() => {
    if (value && Object.keys(value).length > 0) {
      // Merge value with defaults to ensure all days are present
      const defaults = getDefaultHours();
      const merged: Record<string, DayHours> = { ...defaults };
      Object.keys(value).forEach(key => {
        if (key !== '_publicHolidayRule' && value[key]) {
          merged[key] = {
            open: value[key].open || '09:00',
            close: value[key].close || '00:00',
            closed: value[key].closed ?? false,
          };
        }
      });
      return merged;
    }
    return getDefaultHours();
  });

  const [publicHolidayRule, setPublicHolidayRule] = useState<string>(initialPublicHolidayRule || 'closed');

  useEffect(() => {
    if (value && Object.keys(value).length > 0) {
      // Merge value with defaults to ensure all days are present
      const defaults = getDefaultHours();
      const merged: Record<string, DayHours> = { ...defaults };
      Object.keys(value).forEach(key => {
        if (key !== '_publicHolidayRule' && value[key]) {
          merged[key] = {
            open: value[key].open || '09:00',
            close: value[key].close || '00:00',
            closed: value[key].closed ?? false,
          };
        }
      });
      setHours(merged);
    }
  }, [value]);

  const updateDay = (dayKey: string, updates: Partial<DayHours>) => {
    // Ensure we have a valid DayHours object for the day being updated
    const currentDayHours = hours[dayKey] || { open: '09:00', close: '00:00', closed: false };
    const updatedDayHours: DayHours = {
      open: updates.open ?? currentDayHours.open ?? '09:00',
      close: updates.close ?? currentDayHours.close ?? '00:00',
      closed: updates.closed ?? currentDayHours.closed ?? false,
    };
    
    const newHours = {
      ...hours,
      [dayKey]: updatedDayHours,
    };
    
    // If Monday is being updated, auto-fill all other days with the same values
    if (dayKey === 'monday') {
      DAYS.forEach(day => {
        if (day.key !== 'monday') {
          newHours[day.key] = {
            open: updatedDayHours.open,
            close: updatedDayHours.close,
            closed: updatedDayHours.closed,
          };
        }
      });
    }
    
    setHours(newHours);
    onChange(newHours);
  };

  const handlePublicHolidayChange = (rule: string) => {
    setPublicHolidayRule(rule);
    if (onPublicHolidayRuleChange) {
      onPublicHolidayRuleChange(rule);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Opening Hours
        </label>
        <div className="space-y-3 border border-gray-200 rounded-md p-4">
          {DAYS.map((day) => {
            // Ensure we always have a valid DayHours object with string values
            const dayHours: DayHours = hours[day.key] || { open: '09:00', close: '00:00', closed: false };
            const openValue = dayHours.open || '09:00';
            const closeValue = dayHours.close || '00:00';
            const isClosed = dayHours.closed ?? false;
            
            return (
              <div key={day.key} className="flex items-center space-x-4">
                <div className="w-24 text-sm font-medium text-gray-700">
                  {day.label}
                </div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={!isClosed}
                    onChange={(e) => updateDay(day.key, { closed: !e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-600">Open</span>
                </label>
                {!isClosed && (
                  <>
                    <input
                      type="time"
                      value={openValue}
                      onChange={(e) => updateDay(day.key, { open: e.target.value })}
                      className="px-2 py-1 border border-gray-300 rounded-md text-sm text-gray-900"
                    />
                    <span className="text-gray-500">to</span>
                    <input
                      type="time"
                      value={closeValue}
                      onChange={(e) => updateDay(day.key, { close: e.target.value })}
                      className="px-2 py-1 border border-gray-300 rounded-md text-sm text-gray-900"
                    />
                  </>
                )}
                {isClosed && (
                  <span className="text-sm text-gray-500 italic">Closed</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Public Holiday Rule
        </label>
        <select
          value={publicHolidayRule}
          onChange={(e) => handlePublicHolidayChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="closed">Closed on Public Holidays</option>
          <option value="normal">Normal Hours on Public Holidays</option>
          <option value="special">Special Hours (specify separately)</option>
        </select>
        <p className="mt-1 text-xs text-gray-500">
          How should this venue handle public holidays?
        </p>
      </div>
    </div>
  );
}
