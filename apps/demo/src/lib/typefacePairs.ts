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
    id: 'classic-serif',
    name: 'Classic Serif',
    headline: {
      family: "'Playfair Display', serif",
      weight: 700,
    },
    body: {
      family: "'Source Sans Pro', sans-serif",
      weight: 400,
    },
  },
  {
    id: 'modern-sans',
    name: 'Modern Sans',
    headline: {
      family: "'Montserrat', sans-serif",
      weight: 700,
    },
    body: {
      family: "'Open Sans', sans-serif",
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
    id: 'geometric',
    name: 'Geometric',
    headline: {
      family: "'Raleway', sans-serif",
      weight: 700,
    },
    body: {
      family: "'Lato', sans-serif",
      weight: 400,
    },
  },
  {
    id: 'humanist',
    name: 'Humanist',
    headline: {
      family: "'Merriweather', serif",
      weight: 700,
    },
    body: {
      family: "'Lato', sans-serif",
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
    id: 'editorial',
    name: 'Editorial',
    headline: {
      family: "'Crimson Text', serif",
      weight: 600,
    },
    body: {
      family: "'Work Sans', sans-serif",
      weight: 400,
    },
  },
  {
    id: 'tech-modern',
    name: 'Tech Modern',
    headline: {
      family: "'Space Grotesk', sans-serif",
      weight: 700,
    },
    body: {
      family: "'Inter', sans-serif",
      weight: 400,
    },
  },
  {
    id: 'minimalist',
    name: 'Minimalist',
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
    id: 'refined',
    name: 'Refined',
    headline: {
      family: "'Spectral', serif",
      weight: 600,
    },
    body: {
      family: "'Rubik', sans-serif",
      weight: 400,
    },
  },
  {
    id: 'bold-editorial',
    name: 'Bold Editorial',
    headline: {
      family: "'Bitter', serif",
      weight: 700,
    },
    body: {
      family: "'Nunito Sans', sans-serif",
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
