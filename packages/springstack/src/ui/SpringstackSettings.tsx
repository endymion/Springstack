import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Bug,
  Monitor,
  Moon,
  PlugZap,
  Sun,
  X,
  Zap,
  ZapOff
} from 'lucide-react';
import { AnimatedSelector } from './AnimatedSelector';
import type { SpringstackAppearanceState, SpringstackMotionState } from '../appearance';
import { springstackTypefacePresets } from '../typefaces';

interface SpringstackSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appearance: SpringstackAppearanceState;
  motion: SpringstackMotionState;
  setAppearance: (updates: Partial<SpringstackAppearanceState>) => void;
  setMotion: (updates: Partial<SpringstackMotionState>) => void;
  selectorMotion?: { durationMs: number; ease: string; enterDurationMs: number };
}

const mergeClass = (...classes: Array<string | undefined>) => classes.filter(Boolean).join(' ');

const resolvePreviewMode = (mode: SpringstackAppearanceState['mode']) => {
  if (mode !== 'system') return mode;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const ThemeStripePreview = ({
  themeId,
  resolvedMode
}: {
  themeId: 'neutral' | 'cool' | 'warm';
  resolvedMode: 'light' | 'dark';
}) => (
  <div className={mergeClass(`theme-${themeId}`, resolvedMode, 'w-full')}>
    <div className="flex h-6 w-full">
      <div className="flex-1 bg-primary" />
      <div className="flex-1 bg-secondary" />
      <div className="flex-1 bg-status-true" />
    </div>
  </div>
);

const TypefacePreview = ({
  headline,
  body,
  name
}: {
  headline: { family: string; weight: number };
  body: { family: string; weight: number };
  name: string;
}) => (
  <div className="flex flex-col gap-1 px-1">
    <div
      className="text-sm uppercase tracking-[0.18em]"
      style={{ fontFamily: headline.family, fontWeight: headline.weight }}
    >
      {name}
    </div>
    <div className="text-sm" style={{ fontFamily: body.family, fontWeight: body.weight }}>
      Evidence pack
    </div>
  </div>
);

export function SpringstackSettings({
  open,
  onOpenChange,
  appearance,
  motion,
  setAppearance,
  setMotion,
  selectorMotion
}: SpringstackSettingsProps) {
  const [settingsVisible, setSettingsVisible] = useState(open);
  const [settingsShown, setSettingsShown] = useState(open);
  const motionDisabled = motion.timingMode === 'off';
  const resolvedMode = resolvePreviewMode(appearance.mode);

  useEffect(() => {
    if (open) {
      setSettingsVisible(true);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setSettingsShown(true));
      });
      return () => cancelAnimationFrame(frame);
    }
    setSettingsShown(false);
    const timeout = window.setTimeout(() => setSettingsVisible(false), 500);
    return () => window.clearTimeout(timeout);
  }, [open]);

  if (!settingsVisible) return null;

  return (
    <div
      className={mergeClass('fixed inset-0 z-[2000]', settingsShown ? 'pointer-events-auto' : 'pointer-events-none')}
      onClick={() => onOpenChange(false)}
    >
      <div
        className={mergeClass(
          'absolute inset-0 bg-background/60 backdrop-blur-sm transition-opacity duration-300',
          settingsShown ? 'opacity-100' : 'opacity-0'
        )}
      />
      <div
        className={mergeClass(
          'absolute inset-0 rounded-md bg-card p-2 transition-transform duration-500 ease-out overflow-hidden',
          settingsShown ? 'translate-y-0' : 'translate-y-full'
        )}
        onClick={event => event.stopPropagation()}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-headline text-sm font-semibold text-foreground">Settings</div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground pl-6"
            >
              <X className="h-4 w-4" strokeWidth={2.25} />
              Close
            </button>
          </div>

          <div className="mt-6 flex-1 overflow-y-auto pr-1" style={{ scrollbarGutter: 'stable' }}>
            <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-6">
              <div>
                <h3 className="mb-2 font-eyebrow text-xs font-bold text-muted-foreground">Mode</h3>
                <AnimatedSelector
                  name="mode"
                  value={appearance.mode}
                  onChange={value => setAppearance({ mode: value as SpringstackAppearanceState['mode'] })}
                  layout="grid"
                  motionDisabled={motionDisabled}
                  motionDurationMs={selectorMotion?.durationMs}
                  motionEase={selectorMotion?.ease}
                  motionEnterDurationMs={selectorMotion?.enterDurationMs}
                  options={[
                    { id: 'light', label: 'Light', icon: Sun },
                    { id: 'dark', label: 'Dark', icon: Moon },
                    { id: 'system', label: 'System', icon: Monitor }
                  ]}
                />
              </div>
              <div>
                <h3 className="mb-2 font-eyebrow text-xs font-bold text-muted-foreground">Motion</h3>
                <AnimatedSelector
                  name="motion"
                  value={motion.motionPreset}
                  onChange={value => setMotion({ motionPreset: value as SpringstackMotionState['motionPreset'] })}
                  layout="compact"
                  className="grid-cols-3"
                  motionDisabled={motionDisabled}
                  motionDurationMs={selectorMotion?.durationMs}
                  motionEase={selectorMotion?.ease}
                  motionEnterDurationMs={selectorMotion?.enterDurationMs}
                  options={[
                    { id: 'normal', label: 'Normal', icon: Zap },
                    { id: 'reduced', label: 'Reduced', icon: ZapOff },
                    { id: 'system', label: 'System', icon: Monitor },
                    { id: 'gratuitous', label: 'Gratuitous', icon: PlugZap },
                    { id: 'slow', label: 'Slow', icon: Bug },
                    { id: 'off', label: 'Off', icon: ZapOff }
                  ]}
                />
              </div>
            </div>
            <div>
              <h3 className="mb-2 font-eyebrow text-xs font-bold text-muted-foreground">Theme</h3>
              <AnimatedSelector
                name="theme"
                value={appearance.theme}
                onChange={value => setAppearance({ theme: value as SpringstackAppearanceState['theme'] })}
                layout="grid"
                className="grid-cols-3"
                motionDisabled={motionDisabled}
                motionDurationMs={selectorMotion?.durationMs}
                motionEase={selectorMotion?.ease}
                motionEnterDurationMs={selectorMotion?.enterDurationMs}
                options={[
                  {
                    id: 'neutral',
                    label: 'Neutral',
                    preview: <ThemeStripePreview themeId="neutral" resolvedMode={resolvedMode} />
                  },
                  {
                    id: 'cool',
                    label: 'Cool',
                    preview: <ThemeStripePreview themeId="cool" resolvedMode={resolvedMode} />
                  },
                  {
                    id: 'warm',
                    label: 'Warm',
                    preview: <ThemeStripePreview themeId="warm" resolvedMode={resolvedMode} />
                  }
                ]}
              />
            </div>
          </div>

          <div className="mt-6">
            <h3 className="mb-2 font-eyebrow text-xs font-bold text-muted-foreground">Typeface</h3>
            <AnimatedSelector
              name="typeface"
              value={appearance.typeface}
              onChange={value => setAppearance({ typeface: value })}
              layout="grid"
              className="grid-cols-3"
              motionDisabled={motionDisabled}
              motionDurationMs={selectorMotion?.durationMs}
              motionEase={selectorMotion?.ease}
              motionEnterDurationMs={selectorMotion?.enterDurationMs}
              options={springstackTypefacePresets.map(preset => ({
                id: preset.id,
                label: '',
                preview: (
                  <TypefacePreview
                    headline={preset.headline}
                    body={preset.body}
                    name={preset.name}
                  />
                )
              }))}
            />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
