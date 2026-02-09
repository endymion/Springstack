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
    headline: { family: "'Inter', ui-sans-serif, system-ui, sans-serif", weight: 600 },
    body: { family: "'Inter', ui-sans-serif, system-ui, sans-serif", weight: 400 },
    eyebrow: { family: "'Inter', ui-sans-serif, system-ui, sans-serif", weight: 600 },
    caps: 'all-caps'
  },
  {
    id: 'impact',
    name: 'Impact',
    headline: { family: "'Anton', Impact, 'Haettenschweiler', 'Arial Narrow Bold', sans-serif", weight: 400 },
    body: { family: "'Inter', ui-sans-serif, system-ui, sans-serif", weight: 400 },
    eyebrow: { family: "'Inter', ui-sans-serif, system-ui, sans-serif", weight: 600 },
    caps: 'all-caps'
  },
  {
    id: 'mono-utility',
    name: 'Mono Utility',
    headline: { family: "'Roboto Mono', ui-monospace, SFMono-Regular, monospace", weight: 600 },
    body: { family: "'Inter', ui-sans-serif, system-ui, sans-serif", weight: 400 },
    eyebrow: { family: "'Roboto Mono', ui-monospace, SFMono-Regular, monospace", weight: 600 },
    caps: 'all-caps'
  },
  {
    id: 'editorial',
    name: 'Editorial',
    headline: { family: "'Playfair Display', 'Times New Roman', serif", weight: 600 },
    body: { family: "'Source Sans 3', ui-sans-serif, system-ui, sans-serif", weight: 400 },
    eyebrow: { family: "'Source Sans 3', ui-sans-serif, system-ui, sans-serif", weight: 600 },
    caps: 'small-caps'
  },
  {
    id: 'jersey-arcade',
    name: 'Jersey Arcade',
    headline: { family: "'Jersey 15', ui-sans-serif, system-ui, sans-serif", weight: 400 },
    body: { family: "'Inter', ui-sans-serif, system-ui, sans-serif", weight: 400 },
    eyebrow: { family: "'Roboto Mono', ui-monospace, SFMono-Regular, monospace", weight: 600 },
    caps: 'all-caps'
  },
  {
    id: 'card-catalog',
    name: 'Card Catalog',
    headline: { family: "'Special Elite', 'Courier New', monospace", weight: 400 },
    body: { family: "'Source Sans 3', ui-sans-serif, system-ui, sans-serif", weight: 400 },
    eyebrow: { family: "'Roboto Mono', ui-monospace, SFMono-Regular, monospace", weight: 600 },
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
    const rawFamily = family.split(',')[0]?.trim().replace(/^['"]|['"]$/g, '');
    if (!rawFamily) return;
    const weights = grouped.get(rawFamily) ?? new Set<number>();
    weights.add(weight);
    grouped.set(rawFamily, weights);
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
