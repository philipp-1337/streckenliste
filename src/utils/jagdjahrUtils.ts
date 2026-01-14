/**
 * Utility functions for handling hunting year (Jagdjahr) calculations
 * A hunting year runs from May to April (e.g., May 2025 - April 2026 = "2025/2026")
 */

/**
 * Get the hunting year string for a given date
 * @param date Date string or Date object
 * @returns Hunting year string like "2025/2026" or null if date is invalid
 */
export function getJagdjahr(date: string | Date): string | null {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) {
    return null;
  }
  
  const month = d.getMonth(); // 0-11
  const year = d.getFullYear();
  
  // If month is May (4) or later, hunting year starts this year
  // If month is before May (0-3 = Jan-Apr), hunting year started last year
  if (month >= 4) {
    // May-December: hunting year is current/next
    return `${year}/${year + 1}`;
  } else {
    // January-April: hunting year is previous/current
    return `${year - 1}/${year}`;
  }
}

/**
 * Get the current hunting year based on today's date
 * @returns Current hunting year string like "2025/2026"
 */
export function getCurrentJagdjahr(): string {
  const jagdjahr = getJagdjahr(new Date());
  // This should never be null for current date, but return a fallback just in case
  if (!jagdjahr) {
    const year = new Date().getFullYear();
    return `${year}/${year + 1}`;
  }
  return jagdjahr;
}

/**
 * Get list of all available hunting years from a list of entries
 * @param eintraege Array of entries with datum field
 * @returns Sorted array of hunting year strings (newest first)
 */
export function getAvailableJagdjahre(eintraege: { datum: string }[]): string[] {
  const jahreSet = new Set<string>();
  
  eintraege.forEach(eintrag => {
    const jagdjahr = getJagdjahr(eintrag.datum);
    if (jagdjahr) {
      jahreSet.add(jagdjahr);
    }
  });
  
  // Convert to array and sort (newest first)
  return Array.from(jahreSet).sort().reverse();
}

/**
 * Check if a date falls within a specific hunting year
 * @param date Date to check
 * @param jagdjahr Hunting year string like "2025/2026"
 * @returns true if date is within the hunting year
 */
export function isDateInJagdjahr(date: string | Date, jagdjahr: string): boolean {
  const entryJagdjahr = getJagdjahr(date);
  return entryJagdjahr === jagdjahr;
}
