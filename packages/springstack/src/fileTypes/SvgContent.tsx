import { useEffect, useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import { codeToHtml } from 'shiki/bundle/web';
import { Code2, Eye } from 'lucide-react';
import { BaseContent } from '../registryComponents';
import type { FileTypeContentProps } from './types';

interface SvgNodeData {
  url?: string;
  width?: number;
  height?: number;
}

type ViewMode = 'preview' | 'source';

const parseDimensions = (svgText: string) => {
  try {
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    if (!svg) return { width: undefined, height: undefined };
    const widthAttr = svg.getAttribute('width');
    const heightAttr = svg.getAttribute('height');
    const viewBox = svg.getAttribute('viewBox');
    if (viewBox) {
      const parts = viewBox.split(/\s+/).map(Number);
      if (parts.length === 4 && parts.every(n => !Number.isNaN(n))) {
        return { width: parts[2], height: parts[3] };
      }
    }
    return {
      width: widthAttr ? Number(widthAttr) : undefined,
      height: heightAttr ? Number(heightAttr) : undefined
    };
  } catch {
    return { width: undefined, height: undefined };
  }
};

export function SvgContent<TData extends SvgNodeData = SvgNodeData>({
  node,
  icon,
  detailLine
}: FileTypeContentProps<TData>) {
  const [mode, setMode] = useState<ViewMode>('preview');
  const [svgText, setSvgText] = useState('');
  const [sourceHtml, setSourceHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width?: number; height?: number }>({
    width: node.data?.width,
    height: node.data?.height
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!node.data?.url) return;
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(node.data.url);
        if (!response.ok) throw new Error('Failed to load SVG');
        const text = await response.text();
        if (cancelled) return;
        setSvgText(text);
        setDimensions(prev => {
          const parsed = parseDimensions(text);
          return {
            width: prev.width ?? parsed.width,
            height: prev.height ?? parsed.height
          };
        });
        const highlighted = await codeToHtml(text, { lang: 'xml', theme: 'github-dark' });
        if (!cancelled) setSourceHtml(highlighted);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load SVG');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [node.data?.url]);

  const sanitizedSvg = useMemo(() => {
    if (!svgText) return '';
    return DOMPurify.sanitize(svgText, {
      USE_PROFILES: { svg: true, svgFilters: true },
      FORBID_TAGS: ['script'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick']
    });
  }, [svgText]);

  const dimensionLabel = dimensions.width && dimensions.height
    ? `${Math.round(dimensions.width)} × ${Math.round(dimensions.height)}`
    : undefined;

  return (
    <BaseContent node={node} icon={icon} detailLine={detailLine} data-testid="file-svg">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">Vector preview</div>
        <div className="flex items-center gap-1 rounded-full border border-muted-foreground/30 bg-card p-1 text-xs">
          <button
            type="button"
            onClick={() => setMode('preview')}
            className={`flex items-center gap-1 rounded-full px-2 py-1 transition-colors ${
              mode === 'preview' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Eye className="h-3 w-3" />
            Preview
          </button>
          <button
            type="button"
            onClick={() => setMode('source')}
            className={`flex items-center gap-1 rounded-full px-2 py-1 transition-colors ${
              mode === 'source' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Code2 className="h-3 w-3" />
            Source
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-xs text-muted-foreground">Loading SVG…</div>
      ) : error ? (
        <div className="text-xs text-destructive">{error}</div>
      ) : mode === 'preview' ? (
        <div className="relative">
          <div
            className="rounded-md border border-muted-foreground/20 bg-card p-3"
            style={{
              backgroundImage:
                'linear-gradient(45deg, rgba(148,163,184,0.25) 25%, transparent 25%, transparent 75%, rgba(148,163,184,0.25) 75%, rgba(148,163,184,0.25)), linear-gradient(45deg, rgba(148,163,184,0.25) 25%, transparent 25%, transparent 75%, rgba(148,163,184,0.25) 75%, rgba(148,163,184,0.25))',
              backgroundSize: '24px 24px',
              backgroundPosition: '0 0, 12px 12px'
            }}
          >
            <div
              className="w-full"
              dangerouslySetInnerHTML={{ __html: sanitizedSvg }}
            />
          </div>
          {dimensionLabel ? (
            <div className="absolute right-3 top-3 rounded-full bg-card/90 px-2 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
              {dimensionLabel}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-md border border-muted-foreground/20 bg-card">
          <div className="flex items-center justify-between border-b border-muted-foreground/20 px-3 py-2 text-xs text-muted-foreground">
            <span>SVG Source</span>
            <button
              type="button"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => {
                if (!svgText) return;
                void navigator.clipboard.writeText(svgText);
              }}
            >
              Copy
            </button>
          </div>
          <div className="grid grid-cols-[auto,1fr] gap-2 px-3 py-2 text-xs">
            <div className="select-none text-muted-foreground">
              {svgText.split('\n').map((_, index) => (
                <div key={index} className="pr-2 text-right leading-5">{index + 1}</div>
              ))}
            </div>
            <div
              className="overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: sourceHtml }}
            />
          </div>
        </div>
      )}
    </BaseContent>
  );
}
