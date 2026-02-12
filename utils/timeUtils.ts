
/**
 * Parses time strings like "7 AM", "07:00", "21:15", "7:30 PM" into minutes from midnight.
 */
export function parseTimeToMinutes(timeStr: string): number | null {
  const normalized = timeStr.trim().toUpperCase();
  
  // Try HH:MM format (24h or implied 12h if less than 13)
  const isoMatch = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (isoMatch) {
    const hours = parseInt(isoMatch[1], 10);
    const minutes = parseInt(isoMatch[2], 10);
    if (hours < 24 && minutes < 60) return hours * 60 + minutes;
  }

  // Try "7 AM" or "7:30 PM"
  const amPmMatch = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
  if (amPmMatch) {
    let hours = parseInt(amPmMatch[1], 10);
    const minutes = amPmMatch[2] ? parseInt(amPmMatch[2], 10) : 0;
    const period = amPmMatch[3];

    if (hours === 12) hours = 0;
    if (period === 'PM') hours += 12;
    
    if (hours < 24 && minutes < 60) return hours * 60 + minutes;
  }

  // Try plain "7" as implied AM or 24h
  const plainMatch = normalized.match(/^(\d{1,2})$/);
  if (plainMatch) {
    const hours = parseInt(plainMatch[1], 10);
    if (hours < 24) return hours * 60;
  }

  return null;
}

export function calculateHours(
  checkIn: string, 
  checkOut: string, 
  breakMin: number, 
  baseHours: number
): { workingHours: number; otHours: number } | null {
  const inMin = parseTimeToMinutes(checkIn);
  const outMin = parseTimeToMinutes(checkOut);

  if (inMin === null || outMin === null) return null;

  let durationMin = outMin - inMin;
  
  // Night shift support
  if (outMin < inMin) {
    durationMin += 24 * 60;
  }

  const workingMinutes = Math.max(0, durationMin - breakMin);
  const workingHours = parseFloat((workingMinutes / 60).toFixed(2));
  const otHours = parseFloat(Math.max(0, workingHours - baseHours).toFixed(2));

  return { workingHours, otHours };
}

export function formatMinutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}
