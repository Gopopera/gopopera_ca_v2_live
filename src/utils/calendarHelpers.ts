import { Event } from '../../types';

/**
 * Normalize time to 24h format (HH:mm)
 * Accepts "HH:mm" or "h:mm AM/PM" (case-insensitive)
 */
export function normalizeTimeTo24h(time: string): string {
  if (!time || typeof time !== 'string') return '';
  
  const trimmed = time.trim();
  
  // Already in 24h format (HH:mm)
  const match24h = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match24h) {
    const hour = parseInt(match24h[1], 10);
    const minute = parseInt(match24h[2], 10);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    }
    return '';
  }
  
  // 12h format with AM/PM
  const match12h = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12h) {
    let hour = parseInt(match12h[1], 10);
    const minute = parseInt(match12h[2], 10);
    const period = match12h[3].toUpperCase();
    
    if (hour < 1 || hour > 12 || minute < 0 || minute > 59) {
      return '';
    }
    
    if (period === 'AM') {
      if (hour === 12) hour = 0;
    } else {
      if (hour !== 12) hour += 12;
    }
    
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }
  
  return '';
}

export interface CalendarData {
  start: Date;
  end: Date;
  title: string;
  description: string;
  location: string;
  url: string;
}

/**
 * Build calendar data from an event
 * Returns null if required fields are missing or invalid
 */
export function buildCalendarData(event: Event | any): CalendarData | null {
  // Validate required fields
  if (!event?.id || !event?.title || !event?.date || !event?.time) {
    return null;
  }
  
  // Parse date (YYYY-MM-DD)
  const dateParts = event.date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateParts) {
    return null;
  }
  
  const year = parseInt(dateParts[1], 10);
  const month = parseInt(dateParts[2], 10) - 1; // monthIndex (0-based)
  const day = parseInt(dateParts[3], 10);
  
  // Normalize time to HH:mm
  const normalizedTime = normalizeTimeTo24h(event.time);
  if (!normalizedTime) {
    return null;
  }
  
  const [hourStr, minuteStr] = normalizedTime.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  
  // Construct start as LOCAL Date
  const start = new Date(year, month, day, hour, minute, 0);
  
  // Default duration = 120 minutes
  const durationMs = 120 * 60 * 1000;
  const end = new Date(start.getTime() + durationMs);
  
  // Location: prefer event.location, else combine address and city
  let location = '';
  if (event.location && event.location.trim()) {
    location = event.location.trim();
  } else {
    const parts: string[] = [];
    if (event.address && event.address.trim()) {
      parts.push(event.address.trim());
    }
    if (event.city && event.city.trim()) {
      parts.push(event.city.trim());
    }
    location = parts.join(', ');
  }
  
  // Description: truncate to 500 chars
  let description = '';
  if (event.description && typeof event.description === 'string') {
    description = event.description.substring(0, 500);
  }
  
  // URL: use window.location.origin + "/event/" + event.id
  const url = `${window.location.origin}/event/${event.id}`;
  
  return {
    start,
    end,
    title: event.title,
    description,
    location,
    url,
  };
}

/**
 * Format date to ICS UTC format: YYYYMMDDTHHMMSSZ
 */
export function formatICSDateUTC(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Escape text for ICS format
 */
export function escapeICSText(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

export interface ICSResult {
  filename: string;
  content: string;
}

/**
 * Generate ICS file content for an event
 */
export function generateICS(event: Event | any): ICSResult | null {
  const data = buildCalendarData(event);
  if (!data) {
    return null;
  }
  
  const now = new Date();
  const uid = `popera-${event.id}@gopopera.ca`;
  const filename = `popera-${event.id}.ics`;
  
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Popera//Calendar v1//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatICSDateUTC(now)}`,
    `DTSTART:${formatICSDateUTC(data.start)}`,
    `DTEND:${formatICSDateUTC(data.end)}`,
    `SUMMARY:${escapeICSText(data.title)}`,
    `DESCRIPTION:${escapeICSText(data.description + (data.description ? '\\n\\n' : '') + data.url)}`,
    `LOCATION:${escapeICSText(data.location)}`,
    `URL:${data.url}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  
  const content = lines.join('\r\n');
  
  return { filename, content };
}

/**
 * Build Google Calendar URL for an event
 */
export function buildGoogleCalendarURL(event: Event | any): string {
  const data = buildCalendarData(event);
  if (!data) {
    return '';
  }
  
  const startUTC = formatICSDateUTC(data.start);
  const endUTC = formatICSDateUTC(data.end);
  
  const params = new URLSearchParams();
  params.set('action', 'TEMPLATE');
  params.set('text', data.title);
  params.set('dates', `${startUTC}/${endUTC}`);
  params.set('details', data.description + (data.description ? '\n\n' : '') + data.url);
  params.set('location', data.location);
  params.set('sprop', `website:${data.url}`);
  
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

