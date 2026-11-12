import { useEffect } from 'react';

/**
 * Sets document.title using EduHub's `<Page> | EduHub` naming convention.
 */
export function usePageTitle(title: string): void {
  useEffect(() => {
    const trimmed = title.trim();
    document.title = trimmed ? `${trimmed} | EduHub` : 'EduHub — Online Learning Platform';
  }, [title]);
}
