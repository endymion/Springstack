import { useState, useEffect } from 'react';

export type Theme = 'cool' | 'warm' | 'neutral';
export type Mode = 'light' | 'dark' | 'system';

interface AppearanceState {
  theme: Theme;
  mode: Mode;
  reduceMotion: boolean;
}

const STORAGE_KEY = 'springstack-appearance';

export function useAppearance() {
  // Initialize from storage or default
  const [appearance, setAppearance] = useState<AppearanceState>(() => {
    // Check system preference for reduced motion
    // Safe check for window availability (CSR)
    const systemReduceMotion = typeof window !== 'undefined' 
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
        : false;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return {
            theme: parsed.theme || 'neutral',
            mode: parsed.mode || 'system',
            // Default to system preference if not explicitly set in storage
            reduceMotion: parsed.reduceMotion ?? systemReduceMotion
        };
      } catch (e) {
        console.error('Failed to parse appearance settings:', e);
      }
    }
    return { theme: 'neutral', mode: 'system', reduceMotion: systemReduceMotion };
  });

  const updateAppearance = (updates: Partial<AppearanceState>) => {
    setAppearance(prev => {
        const next = { ...prev, ...updates };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
    });
  };

  const setTheme = (theme: Theme) => updateAppearance({ theme });
  const setMode = (mode: Mode) => updateAppearance({ mode });
  const setReduceMotion = (reduceMotion: boolean) => updateAppearance({ reduceMotion });

  // Apply classes to document root
  useEffect(() => {
    const root = document.documentElement;
    
    // Reset themes
    root.classList.remove('theme-cool', 'theme-warm', 'theme-neutral');
    root.classList.add(`theme-${appearance.theme}`);

    // Handle Mode
    root.classList.remove('light', 'dark');
    if (appearance.mode === 'system') {
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.add(systemDark ? 'dark' : 'light');
    } else {
        root.classList.add(appearance.mode);
    }
  }, [appearance.theme, appearance.mode]);

  // Listen for system preference changes when in system mode
  useEffect(() => {
    if (appearance.mode !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
        const root = document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(mediaQuery.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [appearance.mode]);

  return {
    theme: appearance.theme,
    mode: appearance.mode,
    reduceMotion: appearance.reduceMotion,
    setTheme,
    setMode,
    setReduceMotion
  };
}
