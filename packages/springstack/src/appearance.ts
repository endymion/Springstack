import { useEffect, useState } from 'react';
import type { SpringstackTimingMode } from './types';
import { getTypefacePreset, loadGoogleFonts, springstackTypefacePresets } from './typefaces';

export type SpringstackTheme = 'cool' | 'warm' | 'neutral';
export type SpringstackMode = 'light' | 'dark' | 'system';
export type SpringstackMotionPreset = 'normal' | 'reduced' | 'system' | 'gratuitous' | 'slow' | 'off';

export interface SpringstackAppearanceState {
  theme: SpringstackTheme;
  mode: SpringstackMode;
  reduceMotion: boolean;
  typeface: string;
}

export interface SpringstackMotionState {
  motionPreset: SpringstackMotionPreset;
  timingMode: SpringstackTimingMode;
}

export interface SpringstackAppearanceOptions {
  storageKey?: string;
  motionKey?: string;
  defaults?: Partial<SpringstackAppearanceState & SpringstackMotionState>;
}

const getSystemReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const resolveTimingMode = (
  motionPreset: SpringstackMotionPreset,
  reduceMotion: boolean
): SpringstackTimingMode => {
  if (motionPreset === 'off') return 'off';
  if (motionPreset === 'system') return reduceMotion ? 'reduced' : 'normal';
  if (motionPreset === 'reduced') return 'reduced';
  if (motionPreset === 'gratuitous') return 'gratuitous';
  if (motionPreset === 'slow') return 'slow';
  return 'normal';
};

export const useSpringstackAppearance = (options: SpringstackAppearanceOptions = {}) => {
  const storageKey = options.storageKey ?? 'springstack-appearance';
  const motionKey = options.motionKey ?? 'springstack-motion';
  const defaultTypeface = springstackTypefacePresets[0]?.id ?? 'studio-sans';

  const [appearance, setAppearance] = useState<SpringstackAppearanceState>(() => {
    const systemReduceMotion = getSystemReducedMotion();
    if (typeof window === 'undefined') {
      return {
        theme: options.defaults?.theme ?? 'cool',
        mode: options.defaults?.mode ?? 'system',
        reduceMotion: options.defaults?.reduceMotion ?? systemReduceMotion,
        typeface: options.defaults?.typeface ?? defaultTypeface
      };
    }

    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return {
          theme: parsed.theme || options.defaults?.theme || 'cool',
          mode: parsed.mode || options.defaults?.mode || 'system',
          reduceMotion: parsed.reduceMotion ?? options.defaults?.reduceMotion ?? systemReduceMotion,
          typeface: parsed.typeface || options.defaults?.typeface || defaultTypeface
        };
      } catch (error) {
        console.error('Failed to parse Springstack appearance settings:', error);
      }
    }

    return {
      theme: options.defaults?.theme ?? 'cool',
      mode: options.defaults?.mode ?? 'system',
      reduceMotion: options.defaults?.reduceMotion ?? systemReduceMotion,
      typeface: options.defaults?.typeface ?? defaultTypeface
    };
  });

  const [motionPreset, setMotionPreset] = useState<SpringstackMotionPreset>(() => {
    if (typeof window === 'undefined') return (options.defaults?.motionPreset as SpringstackMotionPreset) ?? 'system';
    const stored = localStorage.getItem(motionKey);
    if (!stored) return (options.defaults?.motionPreset as SpringstackMotionPreset) ?? 'system';
    if (stored === 'normal' || stored === 'reduced' || stored === 'system' || stored === 'gratuitous' || stored === 'slow' || stored === 'off') {
      return stored as SpringstackMotionPreset;
    }
    return (options.defaults?.motionPreset as SpringstackMotionPreset) ?? 'system';
  });

  const [timingMode, setTimingMode] = useState<SpringstackTimingMode>(() =>
    resolveTimingMode(
      (options.defaults?.motionPreset as SpringstackMotionPreset) ?? motionPreset,
      appearance.reduceMotion
    )
  );

  const setAppearanceState = (updates: Partial<SpringstackAppearanceState>) => {
    setAppearance(prev => {
      const next = { ...prev, ...updates };
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, JSON.stringify(next));
      }
      return next;
    });
  };

  const setMotionState = (updates: Partial<SpringstackMotionState>) => {
    if (updates.motionPreset) {
      setMotionPreset(updates.motionPreset);
      if (typeof window !== 'undefined') {
        localStorage.setItem(motionKey, updates.motionPreset);
      }
    }
    if (updates.timingMode) {
      setTimingMode(updates.timingMode);
    }
  };

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-cool', 'theme-warm', 'theme-neutral');
    root.classList.add(`theme-${appearance.theme}`);

    root.classList.remove('light', 'dark');
    if (appearance.mode === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(systemDark ? 'dark' : 'light');
    } else {
      root.classList.add(appearance.mode);
    }
  }, [appearance.theme, appearance.mode]);

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

  useEffect(() => {
    const preset = getTypefacePreset(appearance.typeface) ?? springstackTypefacePresets[0];
    if (!preset) return;

    const root = document.documentElement;
    root.style.setProperty('--font-headline', preset.headline.family);
    root.style.setProperty('--font-headline-weight', String(preset.headline.weight));
    root.style.setProperty('--font-body', preset.body.family);
    root.style.setProperty('--font-body-weight', String(preset.body.weight));
    root.style.setProperty('--font-eyebrow', preset.eyebrow.family);
    root.style.setProperty('--font-eyebrow-weight', String(preset.eyebrow.weight));
    root.style.setProperty('--font-eyebrow-caps', preset.caps);

    loadGoogleFonts([
      preset.headline,
      preset.body,
      preset.eyebrow
    ]);
  }, [appearance.typeface]);

  useEffect(() => {
    if (motionPreset === 'system') {
      setTimingMode(resolveTimingMode('system', appearance.reduceMotion));
      return;
    }
    setTimingMode(resolveTimingMode(motionPreset, appearance.reduceMotion));
  }, [motionPreset, appearance.reduceMotion]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (resolveTimingMode(motionPreset, appearance.reduceMotion) === 'off') {
      document.documentElement.dataset.motion = 'off';
    } else {
      delete document.documentElement.dataset.motion;
    }
  }, [motionPreset, appearance.reduceMotion]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => {
      setAppearance(prev => {
        const next = { ...prev, reduceMotion: mediaQuery.matches };
        if (typeof window !== 'undefined') {
          localStorage.setItem(storageKey, JSON.stringify(next));
        }
        return next;
      });
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [storageKey]);

  return {
    appearance,
    motion: { motionPreset, timingMode },
    setAppearance: setAppearanceState,
    setMotion: setMotionState
  };
};
