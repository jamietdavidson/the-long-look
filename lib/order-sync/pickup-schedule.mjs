import {PICKUP_SCHEDULE} from './config.js';

const WEEKDAY_MAP = {Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6};

function pad2(value) {
  return String(value).padStart(2, '0');
}

/** @param {Date} date @param {string} timeZone */
export function getZonedComponents(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type) => parts.find((part) => part.type === type)?.value ?? '0';
  const hourRaw = get('hour');

  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(hourRaw === '24' ? '0' : hourRaw),
    minute: Number(get('minute')),
    second: Number(get('second')),
  };
}

/** @param {Date} date @param {string} timeZone */
export function weekdayInTimeZone(date, timeZone) {
  const label = new Intl.DateTimeFormat('en-US', {timeZone, weekday: 'short'}).format(date);
  return WEEKDAY_MAP[label] ?? 0;
}

function addCalendarDays(year, month, day, delta) {
  const shifted = new Date(Date.UTC(year, month - 1, day + delta, 12, 0, 0));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

/**
 * Build a Date for a local wall-clock time in an IANA timezone.
 * @param {string} timeZone
 */
export function dateInTimeZone(timeZone, year, month, day, hour = 0, minute = 0) {
  let guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const current = getZonedComponents(guess, timeZone);
    const diffMinutes =
      (year - current.year) * 525_600 +
      (month - current.month) * 43_200 +
      (day - current.day) * 1_440 +
      (hour - current.hour) * 60 +
      (minute - current.minute);

    if (diffMinutes === 0) return guess;
    guess = new Date(guess.getTime() + diffMinutes * 60_000);
  }

  return guess;
}

/**
 * Next Tuesday or Friday afternoon slot (shop timezone) strictly after `from`.
 * @param {Date} [from]
 * @param {typeof PICKUP_SCHEDULE} [schedule]
 */
export function computeNextPickupSlot(from = new Date(), schedule = PICKUP_SCHEDULE) {
  const {days, hour, minute, timeZone} = schedule;
  const start = getZonedComponents(from, timeZone);

  for (let offset = 0; offset < 21; offset += 1) {
    const calendar = addCalendarDays(start.year, start.month, start.day, offset);
    const probe = dateInTimeZone(timeZone, calendar.year, calendar.month, calendar.day, 12, 0);
    const weekday = weekdayInTimeZone(probe, timeZone);
    if (!days.includes(weekday)) continue;

    const slot = dateInTimeZone(
      timeZone,
      calendar.year,
      calendar.month,
      calendar.day,
      hour,
      minute,
    );
    if (slot.getTime() > from.getTime()) return slot;
  }

  throw new Error('Could not compute next pickup slot within 21 days');
}

/** @param {Date} slot @param {string} timeZone */
export function formatPickupName(slot, timeZone) {
  const label = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(slot);
  return `Pickup · ${label}`;
}

/** Stable key for matching a pickup row to a computed slot (minute precision, shop TZ). */
export function pickupSlotKey(slot, timeZone) {
  const parts = getZonedComponents(slot, timeZone);
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}T${pad2(parts.hour)}:${pad2(parts.minute)}`;
}

/** @param {string | undefined} value */
export function parseAirtableDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
