export interface TypefacePair {
  id: string;
  name: string;
  headline: {
    family: string;
    weight: number;
  };
  body: {
    family: string;
    weight: number;
  };
}

export const typefacePairs: TypefacePair[] = [
  {
    id: 'system-default',
    name: 'System Default',
    headline: {
      family: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
      weight: 600,
    },
    body: {
      family: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
      weight: 400,
    },
  },
  {
    id: 'contemporary',
    name: 'Contemporary',
    headline: {
      family: "'Libre Baskerville', serif",
      weight: 700,
    },
    body: {
      family: "'Source Sans Pro', sans-serif",
      weight: 400,
    },
  },
  {
    id: 'elegant',
    name: 'Elegant',
    headline: {
      family: "'Cormorant Garamond', serif",
      weight: 600,
    },
    body: {
      family: "'Proza Libre', sans-serif",
      weight: 400,
    },
  },
  {
    id: 'mystery',
    name: 'Mystery',
    headline: {
      family: "'DM Serif Display', serif",
      weight: 400,
    },
    body: {
      family: "'DM Sans', sans-serif",
      weight: 400,
    },
  },
  {
    id: 'cathode',
    name: 'Cathode',
    headline: {
      family: "'Jersey 10', cursive",
      weight: 400,
    },
    body: {
      family: "'Inter', sans-serif",
      weight: 400,
    },
  },
];

export function getTypefacePair(id: string): TypefacePair | undefined {
  return typefacePairs.find((pair) => pair.id === id);
}

export function loadGoogleFont(family: string, weight: number): void {
  // Extract font name without fallbacks
  const fontName = family.match(/'([^']+)'/)?.[1];

  if (!fontName || fontName.includes('ui-') || fontName.includes('system')) {
    // System font, no need to load
    return;
  }

  // Check if already loaded
  const linkId = `font-${fontName.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(linkId)) {
    return;
  }

  // Create link element for Google Fonts
  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@${weight}&display=swap`;

  document.head.appendChild(link);
}
