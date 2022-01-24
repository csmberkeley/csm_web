/**
 * Convert 24hr time to 12hr time
 *
 * @param time string in format "HH:MM"
 */
export function formatTime(time: number): string {
  const hours = Math.floor(time / 60);
  const minutes = time % 60;
  const ampm = hours >= 12 ? "PM" : "AM";
  if (minutes == 0) {
    return `${hours > 12 ? hours % 12 : hours} ${ampm}`;
  }
  return `${hours > 12 ? hours % 12 : hours}:${minutes} ${ampm}`;
}

/**
 * Serialize time into HH:MM format
 *
 * @param time number of minutes past midnight
 */
export function serializeTime(time: number): string {
  const hours = Math.floor(time / 60);
  const minutes = time % 60;
  return `${hours < 10 ? "0" : ""}${hours}:${minutes < 10 ? "0" : ""}${minutes}`;
}

/**
 * Parses a 24h time string and returns the number of minutes past midnight.
 * @param time 24h time string
 * @returns minutes past midnight
 */
export function parseTime(time: string): number {
  const [hours, minutes] = time.split(":");
  return parseInt(hours) * 60 + parseInt(minutes);
}
