import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimeSlot(start: string, end: string): string {
  try {
    const formatTime = (t: string) => {
      const [h, m] = t.split(':');
      const hour = parseInt(h, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const formattedHour = hour % 12 || 12;
      return `${formattedHour}:${m} ${ampm}`;
    };
    return `${formatTime(start)} – ${formatTime(end)}`;
  } catch {
    return `${start} - ${end}`;
  }
}

export function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function getAttendanceColorClass(percentage: number): {
  badgeBg: string;
  badgeText: string;
  progressBar: string;
  border: string;
  statusText: string;
} {
  if (percentage >= 75) {
    return {
      badgeBg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
      badgeText: 'text-emerald-600',
      progressBar: 'bg-emerald-500',
      border: 'border-emerald-200 dark:border-emerald-800',
      statusText: 'Good Standing (>75%)',
    };
  } else if (percentage >= 60) {
    return {
      badgeBg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
      badgeText: 'text-amber-600',
      progressBar: 'bg-amber-500',
      border: 'border-amber-200 dark:border-amber-800',
      statusText: 'Low Attendance Warning',
    };
  } else {
    return {
      badgeBg: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
      badgeText: 'text-rose-600',
      progressBar: 'bg-rose-500',
      border: 'border-rose-200 dark:border-rose-800',
      statusText: 'Critical Shortage (<60%)',
    };
  }
}
