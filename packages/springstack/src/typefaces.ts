export type TypefaceCaps = 'all-caps' | 'small-caps';

export interface TypefaceStyleSpec {
  family: string;
  weight: number;
}

export interface TypefacePreset {
  id: string;
  name: string;
  headline: TypefaceStyleSpec;
  body: TypefaceStyleSpec;
  eyebrow: TypefaceStyleSpec;
  caps: TypefaceCaps;
}

export const springstackTypefacePresets: TypefacePreset[] = [
  {
    id: 'studio-sans',
    name: 'Studio Sans',
    headline: { family: 'Inter', weight: 600 },
    body: { family: 'Inter', weight: 400 },
    eyebrow: { family: 'Inter', weight: 600 },
    caps: 'all-caps'
  },
  {
    id: 'signal-serif',
    name: 'Signal Serif',
    headline: { family: 'Source Serif 4', weight: 600 },
    body: { family: 'Inter', weight: 400 },
    eyebrow: { family: 'Inter', weight: 600 },
    caps: 'small-caps'
  },
  {
    id: 'editorial',
    name: 'Editorial',
    headline: { family: 'Playfair Display', weight: 600 },
    body: { family: 'Source Sans 3', weight: 400 },
    eyebrow: { family: 'Source Sans 3', weight: 600 },
    caps: 'small-caps'
  },
  {
    id: 'mono-utility',
    name: 'Mono Utility',
    headline: { family: 'Roboto Mono', weight: 600 },
    body: { family: 'Inter', weight: 400 },
    eyebrow: { family: 'Roboto Mono', weight: 600 },
    caps: 'all-caps'
  },
  {
    id: 'archive-sans',
    name: 'Archive Sans',
    headline: { family: 'IBM Plex Sans', weight: 600 },
    body: { family: 'IBM Plex Sans', weight: 400 },
    eyebrow: { family: 'IBM Plex Sans', weight: 600 },
    caps: 'all-caps'
  },
  {
    id: 'jersey-arcade',
    name: 'Jersey Arcade',
    headline: { family: 'Jersey 15', weight: 400 },
    body: { family: 'Inter', weight: 400 },
    eyebrow: { family: 'Roboto Mono', weight: 600 },
    caps: 'all-caps'
  }
];

export const getTypefacePreset = (id: string) =>
  springstackTypefacePresets.find(preset => preset.id === id);

export const loadGoogleFonts = (families: Array<{ family: string; weight: number }>) => {
  if (typeof document === 'undefined') return;

  const grouped = new Map<string, Set<number>>();
  families.forEach(({ family, weight }) => {
    if (!family) return;
    const weights = grouped.get(family) ?? new Set<number>();
    weights.add(weight);
    grouped.set(family, weights);
  });

  grouped.forEach((weights, family) => {
    const linkId = `springstack-font-${family.replace(/\s+/g, '-').toLowerCase()}`;
    if (document.getElementById(linkId)) return;

    const weightList = Array.from(weights).sort((a, b) => a - b).join(';');
    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weightList}&display=swap`;
    document.head.appendChild(link);
  });
};
