import { formatDistanceToNow } from 'date-fns';

/**
 * Format a date to relative time (e.g., "today", "yesterday", "2d ago")
 */
export function formatRelativeTime(date: Date | string | null): string {
  if (!date) return 'Never';

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInMs = now.getTime() - dateObj.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  // Today
  if (diffInDays === 0) {
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    if (diffInHours === 0) {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      if (diffInMinutes === 0) {
        return 'Just now';
      }
      return `${diffInMinutes}m ago`;
    }
    return `${diffInHours}h ago`;
  }

  // Yesterday
  if (diffInDays === 1) {
    return 'Yesterday';
  }

  // Within a week
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  // Use date-fns for older dates
  return formatDistanceToNow(dateObj, { addSuffix: true });
}

/**
 * Format time duration in milliseconds to a human-readable string
 * @param ms - Duration in milliseconds
 * @param includeSeconds - Whether to include seconds in the output
 */
export function formatDuration(ms: number, includeSeconds = true): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  if (includeSeconds && (seconds > 0 || parts.length === 0)) {
    parts.push(`${seconds}s`);
  }

  return parts.join(' ');
}
