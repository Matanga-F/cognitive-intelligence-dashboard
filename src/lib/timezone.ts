/**
 * CIOS Dashboard — Geo-configurable timezone utility.
 * Reads NEXT_PUBLIC_CIOS_TIMEZONE from environment.
 */

const TIMEZONE = process.env.NEXT_PUBLIC_CIOS_TIMEZONE || 'UTC';

export function getLocalTimezone(): string {
  return TIMEZONE;
}

export function formatLocalTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString('en-ZA', {
      timeZone: TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return isoString;
  }
}

export function formatLocalDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-ZA', {
      timeZone: TIMEZONE,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return isoString;
  }
}

export function getTimeZoneAbbreviation(): string {
  try {
    const now = new Date();
    const abbr = now.toLocaleString('en', { timeZone: TIMEZONE, timeZoneName: 'short' })
      .split(' ')
      .pop() || TIMEZONE;
    return abbr;
  } catch {
    return TIMEZONE;
  }
}

export function getCurrentLocalTime(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TIMEZONE }));
}