import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: [
    'react',
    'react-dom',
    'gsap',
    'lucide-react',
    'react-markdown',
    'remark-gfm',
    'shiki',
    'react-pdf',
    'pdfjs-dist',
    'dompurify',
    'papaparse',
    'xlsx',
    'jszip',
    'sql.js',
    '@videoml/player',
    '@videoml/player/react',
    '@videoml/stdlib',
    '@hpcc-js/wasm-graphviz',
    '@excalidraw/excalidraw',
    'plantuml-encoder',
    'mermaid',
    'parquet-wasm',
    'parquet-wasm/esm/arrow2',
    'apache-arrow'
  ]
});
