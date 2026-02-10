import { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { BaseContent } from '../registryComponents';
import type { FileTypeContentProps } from './types';

interface GraphvizNodeData {
  url?: string;
  nodeCount?: number;
  edgeCount?: number;
}

let graphvizLoader: Promise<any> | null = null;
const loadGraphviz = async () => {
  if (!graphvizLoader) {
    graphvizLoader = import('@hpcc-js/wasm-graphviz').then(mod => mod.Graphviz);
  }
  return graphvizLoader;
};

export function GraphvizContent<TData extends GraphvizNodeData = GraphvizNodeData>({
  node,
  icon,
  detailLine
}: FileTypeContentProps<TData>) {
  const [svg, setSvg] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      if (!node.data?.url) return;
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(node.data.url);
        if (!response.ok) throw new Error('Failed to load DOT source');
        const dot = await response.text();
        const Graphviz = await loadGraphviz();
        const graphviz = await Graphviz.load();
        const rendered = graphviz.dot(dot, 'svg');
        const sanitized = DOMPurify.sanitize(rendered, { USE_PROFILES: { svg: true, svgFilters: true } });
        if (!cancelled) setSvg(sanitized);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to render graph');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void render();
    return () => {
      cancelled = true;
    };
  }, [node.data?.url]);

  return (
    <BaseContent node={node} icon={icon} detailLine={detailLine} data-testid="file-graphviz">
      {node.data?.url ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-md border border-muted-foreground/20 bg-card p-3">
            {loading ? (
              <div className="text-xs text-muted-foreground">Rendering DOT diagram…</div>
            ) : error ? (
              <div className="text-xs text-destructive">{error}</div>
            ) : svg ? (
              <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: svg }} />
            ) : (
              <div className="text-xs text-muted-foreground">No diagram available.</div>
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Renderer</span>
            <span className="text-foreground">Graphviz WASM</span>
          </div>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">No DOT source available.</div>
      )}
    </BaseContent>
  );
}
