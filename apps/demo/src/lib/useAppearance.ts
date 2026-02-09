import { useState, useEffect } from 'react';
import { getTypefacePair, loadGoogleFont } from './typefacePairs';

export type Theme = 'cool' | 'warm' | 'neutral';
export type Mode = 'light' | 'dark' | 'system';

interface AppearanceState {
  theme: Theme;
  mode: Mode;
  reduceMotion: boolean;
  typeface: string;
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

    // Safe check for localStorage availability (CSR)
    if (typeof window === 'undefined') {
      return { theme: 'cool', mode: 'system', reduceMotion: systemReduceMotion, typeface: 'system-default' };
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return {
            theme: parsed.theme || 'cool',
            mode: parsed.mode || 'system',
            // Default to system preference if not explicitly set in storage
            reduceMotion: parsed.reduceMotion ?? systemReduceMotion,
            typeface: parsed.typeface || 'system-default'
        };
      } catch (e) {
        console.error('Failed to parse appearance settings:', e);
      }
    }
    return { theme: 'cool', mode: 'system', reduceMotion: systemReduceMotion, typeface: 'system-default' };
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
  const setTypeface = (typeface: string) => updateAppearance({ typeface });

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

  // Apply typeface CSS variables
  useEffect(() => {
    const typefacePair = getTypefacePair(appearance.typeface);
    if (!typefacePair) return;

    const root = document.documentElement;
    root.style.setProperty('--font-headline', typefacePair.headline.family);
    root.style.setProperty('--font-headline-weight', String(typefacePair.headline.weight));
    root.style.setProperty('--font-body', typefacePair.body.family);
    root.style.setProperty('--font-body-weight', String(typefacePair.body.weight));

    // Load fonts from Google Fonts if needed
    loadGoogleFont(typefacePair.headline.family, typefacePair.headline.weight);
    loadGoogleFont(typefacePair.body.family, typefacePair.body.weight);
  }, [appearance.typeface]);

  return {
    theme: appearance.theme,
    mode: appearance.mode,
    reduceMotion: appearance.reduceMotion,
    typeface: appearance.typeface,
    setTheme,
    setMode,
    setReduceMotion,
    setTypeface
  };
}
