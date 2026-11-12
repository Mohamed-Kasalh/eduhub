import { describe, expect, it } from 'vitest';
import {
  formatBytes,
  formatCompact,
  formatDate,
  formatDuration,
  formatPrice,
  formatRelativeTime,
} from '@/lib/format';

describe('format utilities', () => {
  describe('formatDate', () => {
    it('formats ISO UTC dates with short, long, and monthYear presets', () => {
      const iso = '2026-03-24T16:07:00.000Z';
      expect(formatDate(iso)).toBe('Mar 24, 2026');
      expect(formatDate(iso, { preset: 'long' })).toBe('March 24, 2026');
      expect(formatDate('2025-01-15T00:00:00.000Z', { preset: 'monthYear' })).toBe(
        'January 2025'
      );
    });

    it('returns fallback dash for invalid or empty inputs', () => {
      expect(formatDate(null)).toBe('—');
      expect(formatDate(undefined)).toBe('—');
      expect(formatDate('')).toBe('—');
      expect(formatDate('not-a-date')).toBe('—');
    });
  });

  describe('formatRelativeTime', () => {
    const base = new Date('2026-03-25T12:00:00.000Z');

    it('formats past durations cleanly across seconds, minutes, hours, days, months, years', () => {
      expect(formatRelativeTime('2026-03-25T11:59:35.000Z', base)).toBe('just now');
      expect(formatRelativeTime('2026-03-25T11:45:00.000Z', base)).toBe('15m ago');
      expect(formatRelativeTime('2026-03-25T10:00:00.000Z', base)).toBe('2h ago');
      expect(formatRelativeTime('2026-03-22T12:00:00.000Z', base)).toBe('3d ago');
      expect(formatRelativeTime('2026-01-15T12:00:00.000Z', base)).toBe('2mo ago');
      expect(formatRelativeTime('2024-03-25T12:00:00.000Z', base)).toBe('2y ago');
    });

    it('handles future timestamps and invalid dates safely', () => {
      expect(formatRelativeTime('2026-03-25T12:05:00.000Z', base)).toBe('in 5m');
      expect(formatRelativeTime('invalid', base)).toBe('—');
    });
  });

  describe('formatDuration', () => {
    it('formats seconds into human strings matching EduHub display style', () => {
      expect(formatDuration(0)).toBe('0m');
      expect(formatDuration(-10)).toBe('0m');
      expect(formatDuration(45)).toBe('45s');
      expect(formatDuration(900)).toBe('15m');
      expect(formatDuration(3600)).toBe('1h');
      expect(formatDuration(45000)).toBe('12h 30m');
    });

    it('formats seconds into clock MM:SS / H:MM:SS notation', () => {
      expect(formatDuration(45, 'clock')).toBe('00:45');
      expect(formatDuration(255, 'clock')).toBe('04:15');
      expect(formatDuration(3930, 'clock')).toBe('1:05:30');
    });
  });

  describe('formatBytes', () => {
    it('formats byte counts cleanly across B, KB, MB, GB', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(512)).toBe('512 B');
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(2_097_152)).toBe('2 MB');
      expect(formatBytes(2_147_483_648)).toBe('2 GB');
    });
  });

  describe('formatCompact', () => {
    it('compacts numbers into K, M, B abbreviations', () => {
      expect(formatCompact(0)).toBe('0');
      expect(formatCompact(950)).toBe('950');
      expect(formatCompact(1200)).toBe('1.2K');
      expect(formatCompact(18450)).toBe('18.5K');
      expect(formatCompact(1_500_000)).toBe('1.5M');
      expect(formatCompact(-2400)).toBe('-2.4K');
    });
  });

  describe('formatPrice', () => {
    it('renders Free for zero by default or currency formatted values otherwise', () => {
      expect(formatPrice(0)).toBe('Free');
      expect(formatPrice(0, 'USD', { freeLabel: null })).toBe('$0');
      expect(formatPrice(49.99, 'USD')).toBe('$49.99');
      expect(formatPrice(50, 'USD')).toBe('$50');
      expect(formatPrice(39.5, 'EUR')).toBe('€39.50');
    });
  });
});
