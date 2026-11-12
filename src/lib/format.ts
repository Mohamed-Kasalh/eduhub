export type DateFormatPreset = 'short' | 'long' | 'monthYear';

export interface FormatDateOptions {
  preset?: DateFormatPreset;
  locale?: string;
  timeZone?: string;
}

export type DurationFormatStyle = 'human' | 'clock';

export interface FormatPriceOptions {
  /** Label returned when `amount <= 0`. Pass `null` to format zero as currency. Default `'Free'`. */
  freeLabel?: string | null;
  /** Locale for currency formatting. Default `'en-US'`. */
  locale?: string;
  /** Fraction digits override (defaults to 0 for whole integers or 2 otherwise). */
  decimals?: number;
}

function toValidDate(input: string | number | Date | null | undefined): Date | null {
  if (input === null || input === undefined || input === '') {
    return null;
  }
  const date = input instanceof Date ? new Date(input.getTime()) : new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Formats an ISO-8601 timestamp or Date for UI display (e.g. `"Mar 24, 2026"` or `"January 2025"`).
 */
export function formatDate(
  input: string | number | Date | null | undefined,
  options: FormatDateOptions = {}
): string {
  const date = toValidDate(input);
  if (!date) return '—';

  const { preset = 'short', locale = 'en-US', timeZone = 'UTC' } = options;

  const intlOptions: Intl.DateTimeFormatOptions =
    preset === 'monthYear'
      ? { month: 'long', year: 'numeric', timeZone }
      : preset === 'long'
        ? { month: 'long', day: 'numeric', year: 'numeric', timeZone }
        : { month: 'short', day: 'numeric', year: 'numeric', timeZone };

  return new Intl.DateTimeFormat(locale, intlOptions).format(date);
}

/**
 * Formats an ISO-8601 timestamp as concise relative time (e.g. `"just now"`, `"2h ago"`, `"3d ago"`).
 */
export function formatRelativeTime(
  input: string | number | Date | null | undefined,
  nowInput: string | number | Date = Date.now()
): string {
  const date = toValidDate(input);
  const now = toValidDate(nowInput);
  if (!date || !now) return '—';

  const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);
  const isFuture = diffSeconds < 0;
  const absSeconds = Math.abs(diffSeconds);

  if (absSeconds < 45) {
    return isFuture ? 'in a moment' : 'just now';
  }

  const formatUnit = (value: number, unit: string): string =>
    isFuture ? `in ${value}${unit}` : `${value}${unit} ago`;

  const minutes = Math.floor(absSeconds / 60);
  if (minutes < 60) return formatUnit(minutes, 'm');

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return formatUnit(hours, 'h');

  const days = Math.floor(hours / 24);
  if (days < 30) return formatUnit(days, 'd');

  const months = Math.floor(days / 30);
  if (months < 12) return formatUnit(months, 'mo');

  const years = Math.floor(days / 365);
  return formatUnit(Math.max(1, years), 'y');
}

/**
 * Formats a raw duration in seconds into human-readable (`"12h 30m"`, `"45m"`, `"30s"`)
 * or media player clock notation (`"04:15"`, `"1:05:30"`).
 */
export function formatDuration(
  rawSeconds: number,
  style: DurationFormatStyle = 'human'
): string {
  const safeSeconds =
    Number.isFinite(rawSeconds) && rawSeconds > 0 ? Math.floor(rawSeconds) : 0;

  if (style === 'clock') {
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const seconds = safeSeconds % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    if (hours > 0) {
      return `${hours}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  }

  if (safeSeconds === 0) return '0m';
  if (safeSeconds < 60) return `${safeSeconds}s`;

  const totalMinutes = Math.round(safeSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/**
 * Formats a raw byte count into human-readable storage sizes (`"2 MB"`, `"1.5 KB"`).
 */
export function formatBytes(rawBytes: number, decimals = 1): string {
  if (!Number.isFinite(rawBytes) || rawBytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(
    units.length - 1,
    Math.floor(Math.log(rawBytes) / Math.log(1024))
  );
  if (exponent === 0) {
    return `${Math.round(rawBytes)} B`;
  }

  const scaled = rawBytes / 1024 ** exponent;
  const rounded = Number(scaled.toFixed(Math.max(0, decimals)));
  return `${rounded} ${units[exponent]}`;
}

/**
 * Formats large integer counts into compact strings (`"950"`, `"1.2K"`, `"18.5K"`, `"1.5M"`).
 */
export function formatCompact(rawValue: number): string {
  if (!Number.isFinite(rawValue)) return '0';
  const sign = rawValue < 0 ? '-' : '';
  const abs = Math.abs(rawValue);

  if (abs < 1000) {
    return `${sign}${Math.round(abs)}`;
  }
  if (abs < 1_000_000) {
    const val = Math.round((abs / 1000) * 10) / 10;
    if (val >= 1000) {
      return `${sign}1M`;
    }
    return `${sign}${val}K`;
  }
  if (abs < 1_000_000_000) {
    const val = Math.round((abs / 1_000_000) * 10) / 10;
    return `${sign}${val}M`;
  }
  const val = Math.round((abs / 1_000_000_000) * 10) / 10;
  return `${sign}${val}B`;
}

/**
 * Formats a raw numeric amount paired with its ISO-4217 currency code (e.g. `"$49.99"` or `"Free"`).
 */
export function formatPrice(
  amount: number,
  currency = 'USD',
  options: FormatPriceOptions = {}
): string {
  const { freeLabel = 'Free', locale = 'en-US', decimals } = options;
  const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : 0;

  if (safeAmount === 0 && freeLabel !== null) {
    return freeLabel;
  }

  const fractionDigits =
    decimals !== undefined ? decimals : Number.isInteger(safeAmount) ? 0 : 2;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(safeAmount);
}
