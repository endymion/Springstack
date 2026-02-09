import type { SpringstackTimingConfig, SpringstackTimingMode } from './types';

export const timingPresets: Record<SpringstackTimingMode, SpringstackTimingConfig> = {
  normal: {
    beatMs: 250,
    trackDurationMs: 220,
    morphDurationMs: 480,
    fadeDurationMs: 30,
    crumbHeightDurationMs: 100,
    pushPauseBeats: 1,
    popPauseBeats: 1,
    trackEase: 'slow(0.2, 0.7, false)',
    morphEase: 'elastic.out(1, 0.35)',
    fadeEase: 'power2.out',
    crumbHeightEase: 'power3.inOut',
    enterEase: 'power2.out'
  },
  reduced: {
    beatMs: 80,
    trackDurationMs: 80,
    morphDurationMs: 80,
    fadeDurationMs: 40,
    crumbHeightDurationMs: 80,
    pushPauseBeats: 1,
    popPauseBeats: 1,
    trackEase: 'power2.inOut',
    morphEase: 'power2.out',
    fadeEase: 'power2.out',
    crumbHeightEase: 'power2.inOut',
    enterEase: 'power2.out'
  },
  off: {
    beatMs: 0,
    trackDurationMs: 0,
    morphDurationMs: 0,
    fadeDurationMs: 0,
    crumbHeightDurationMs: 0,
    pushPauseBeats: 0,
    popPauseBeats: 0,
    trackEase: 'none',
    morphEase: 'none',
    fadeEase: 'none',
    crumbHeightEase: 'none',
    enterEase: 'none'
  },
  gratuitous: {
    beatMs: 250,
    trackDurationMs: 150,
    morphDurationMs: 250,
    fadeDurationMs: 30,
    crumbHeightDurationMs: 100,
    pushPauseBeats: 1,
    popPauseBeats: 1,
    trackEase: 'back.inOut(2)',
    morphEase: 'elastic.out(1.2, 0.3)',
    fadeEase: 'power2.out',
    crumbHeightEase: 'back.out(1.8)',
    enterEase: 'back.out(2)'
  },
  slow: {
    beatMs: 1000,
    trackDurationMs: 600,
    morphDurationMs: 1000,
    fadeDurationMs: 120,
    crumbHeightDurationMs: 400,
    pushPauseBeats: 1,
    popPauseBeats: 1,
    trackEase: 'back.inOut(1.1)',
    morphEase: 'back.out(1.2)',
    fadeEase: 'power2.out',
    crumbHeightEase: 'power3.inOut',
    enterEase: 'power3.out'
  }
};

export const resolveTimingConfig = (
  mode: SpringstackTimingMode,
  override?: Partial<SpringstackTimingConfig>
): SpringstackTimingConfig => ({
  ...timingPresets[mode],
  ...override
});
