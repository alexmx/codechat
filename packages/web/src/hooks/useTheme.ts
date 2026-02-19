import { useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark';
type ThemePreference = Theme | 'system';

const STORAGE_KEY = 'codechat-theme';
const MEDIA_QUERY = '(prefers-color-scheme: dark)';

function getSystemTheme(): Theme {
  return window.matchMedia(MEDIA_QUERY).matches ? 'dark' : 'light';
}

function getStoredPreference(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return 'system';
}

function applyTheme(preference: ThemePreference): void {
  const html = document.documentElement;
  if (preference === 'system') {
    html.removeAttribute('data-theme');
  } else {
    html.setAttribute('data-theme', preference);
  }
}

export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(getStoredPreference);
  const [effectiveTheme, setEffectiveTheme] = useState<Theme>(
    () => (preference === 'system' ? getSystemTheme() : preference),
  );

  // Apply the data-theme attribute whenever preference changes
  useEffect(() => {
    applyTheme(preference);
    setEffectiveTheme(preference === 'system' ? getSystemTheme() : preference);
  }, [preference]);

  // Listen for OS-level theme changes when preference is 'system'
  useEffect(() => {
    if (preference !== 'system') return;
    const mq = window.matchMedia(MEDIA_QUERY);
    const handler = (e: MediaQueryListEvent) => {
      setEffectiveTheme(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [preference]);

  const toggleTheme = useCallback(() => {
    setPreference((prev) => {
      const current = prev === 'system' ? getSystemTheme() : prev;
      const next: Theme = current === 'dark' ? 'light' : 'dark';
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return { theme: effectiveTheme, toggleTheme } as const;
}
