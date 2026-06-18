const VND_FORMATTER = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

const DATE_FORMATTER = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const RELATIVE_FORMATTER = new Intl.RelativeTimeFormat('vi-VN', { numeric: 'auto' });

export function formatVnd(amount: number): string {
  return VND_FORMATTER.format(amount);
}

export function formatDate(date: Date | string, withTime = false): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return withTime ? DATE_TIME_FORMATTER.format(d) : DATE_FORMATTER.format(d);
}

// Convert "+84xxxxxxxxx" → "0xxxxxxxxx" for display. Leave already-local numbers unchanged.
export function formatPhoneVn(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed.startsWith('+84')) {
    return `0${trimmed.slice(3)}`;
  }
  return trimmed;
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diffMs = d.getTime() - Date.now();
  const diffSec = Math.round(diffMs / 1000);
  const absSec = Math.abs(diffSec);

  if (absSec < 60) return RELATIVE_FORMATTER.format(diffSec, 'second');
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return RELATIVE_FORMATTER.format(diffMin, 'minute');
  const diffHour = Math.round(diffMin / 60);
  if (Math.abs(diffHour) < 24) return RELATIVE_FORMATTER.format(diffHour, 'hour');
  const diffDay = Math.round(diffHour / 24);
  if (Math.abs(diffDay) < 30) return RELATIVE_FORMATTER.format(diffDay, 'day');
  const diffMonth = Math.round(diffDay / 30);
  if (Math.abs(diffMonth) < 12) return RELATIVE_FORMATTER.format(diffMonth, 'month');
  const diffYear = Math.round(diffDay / 365);
  return RELATIVE_FORMATTER.format(diffYear, 'year');
}
