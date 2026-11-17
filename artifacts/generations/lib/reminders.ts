import type { FamilyReminder } from '@/context/FamilyContext';

export const REMINDER_DAYS = [
  { value: 0, short: 'Sun', full: 'Sunday' },
  { value: 1, short: 'Mon', full: 'Monday' },
  { value: 2, short: 'Tue', full: 'Tuesday' },
  { value: 3, short: 'Wed', full: 'Wednesday' },
  { value: 4, short: 'Thu', full: 'Thursday' },
  { value: 5, short: 'Fri', full: 'Friday' },
  { value: 6, short: 'Sat', full: 'Saturday' },
] as const;

export const CARE_CATEGORIES = ['Shower/Bath', 'Hygiene', 'Doctor', 'Medicine', 'Groceries', 'Custom'] as const;

export function localDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function localTimeInput(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function isValidLocalDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
}

export function parseReminderTimes(value: string): string[] | null {
  const times = value.split(',').map((time) => time.trim()).filter(Boolean);
  if (!times.length || times.length > 6 || times.some((time) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))) return null;
  return [...new Set(times)].sort();
}

function dateFromInput(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function occurrence(date: Date, time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0);
}

export function nextReminderOccurrence(reminder: FamilyReminder, now = new Date()) {
  if (!isValidLocalDate(reminder.scheduledDate) || !reminder.times.length) return null;
  const start = dateFromInput(reminder.scheduledDate);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const graceMs = 10 * 60 * 1000;
  const repeatDays = new Set(reminder.repeatDays);
  const repeat = repeatDays.size > 0;
  const daysToCheck = repeat ? 15 : 1;
  const anchor = repeat ? (start > today ? start : today) : start;

  for (let offset = 0; offset < daysToCheck; offset += 1) {
    const day = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + offset);
    if (day < start) continue;
    if (repeat && !repeatDays.has(day.getDay())) continue;

    for (const time of reminder.times) {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) continue;
      const candidate = occurrence(day, time);
      if (candidate.getTime() >= now.getTime() - graceMs) return candidate;
    }
    if (!repeat) return null;
  }
  return null;
}

export function reminderScheduleLabel(reminder: FamilyReminder) {
  const days = REMINDER_DAYS.filter((day) => reminder.repeatDays.includes(day.value)).map((day) => day.short);
  const [year, month, day] = reminder.scheduledDate.split('-').map(Number);
  const localDate = new Date(year, month - 1, day);
  const dayLabel = days.length
    ? `Every ${days.join(', ')}`
    : `On ${localDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}`;
  return `${dayLabel} · ${reminder.times.join(', ')}`;
}
