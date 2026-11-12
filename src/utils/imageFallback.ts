import type React from 'react';

const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450" fill="none">
  <rect width="800" height="450" fill="#F3EFFF"/>
  <rect x="24" y="24" width="752" height="402" rx="18" fill="#FAF8FF" stroke="#E6E1F5" stroke-width="4" stroke-dasharray="10 8"/>
  <circle cx="400" cy="195" r="56" fill="#E6E1F5"/>
  <rect x="374" y="172" width="52" height="46" rx="10" fill="#6D4AE0"/>
  <path d="M388 188h24M388 198h18" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/>
  <text x="400" y="294" text-anchor="middle" fill="#3F2A9E" font-family="Nunito Sans, sans-serif" font-size="24" font-weight="700">EduHub Course Preview</text>
  <text x="400" y="326" text-anchor="middle" fill="#5F5B75" font-family="Nunito Sans, sans-serif" font-size="16">Image unavailable offline</text>
</svg>`;

export const BRANDED_PLACEHOLDER_SRC = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
  PLACEHOLDER_SVG
)}`;

/**
 * Replaces a broken or offline image source with EduHub's branded lavender placeholder
 * without triggering infinite onError loops.
 */
export function handleImageError(e: React.SyntheticEvent<HTMLImageElement>): void {
  const img = e.currentTarget;
  if (img.dataset.fallbackApplied === '1') return;
  img.dataset.fallbackApplied = '1';
  img.onerror = null;
  img.src = BRANDED_PLACEHOLDER_SRC;
}
