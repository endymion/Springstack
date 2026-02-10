import { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { encode } from 'plantuml-encoder';
import { BaseContent } from '../registryComponents';
import type { FileTypeContentProps } from './types';

interface PlantumlNodeData {
  url?: string;
}

export function PlantumlContent<TData extends PlantumlNodeData = PlantumlNodeData>({
  node,
  icon,
  detailLine
}: FileTypeContentProps<TData>) {
  const [svg, setSvg] = useState('');
  const [source, setSource] = useState('');
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
        if (!response.ok) throw new Error('Failed to load PlantUML source');
        const text = await response.text();
        const encoded = encode(text);
        const diagramUrl = `https://www.plantuml.com/plantuml/svg/${encoded}`;
        const diagramResponse = await fetch(diagramUrl);
        if (!diagramResponse.ok) throw new Error('Failed to render PlantUML diagram');
        const rawSvg = await diagramResponse.text();
        const sanitized = DOMPurify.sanitize(rawSvg, { USE_PROFILES: { svg: true, svgFilters: true } });
        if (!cancelled) {
          setSource(text);
          setSvg(sanitized);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to render PlantUML');
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
    <BaseContent node={node} icon={icon} detailLine={detailLine} data-testid="file-plantuml">
      {node.data?.url ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-md border border-muted-foreground/20 bg-card p-3">
            {loading ? (
              <div className="text-xs text-muted-foreground">Rendering PlantUML diagram…</div>
            ) : error ? (
              <div className="text-xs text-destructive">{error}</div>
            ) : svg ? (
              <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: svg }} />
            ) : (
              <div className="text-xs text-muted-foreground">No diagram available.</div>
            )}
          </div>
          <div className="rounded-md border border-muted-foreground/20 bg-card p-3 text-xs text-muted-foreground">
            <div className="mb-2 text-[0.65rem] uppercase tracking-[0.2em]">Source</div>
            <pre className="whitespace-pre-wrap text-foreground">{source || 'No source loaded.'}</pre>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Renderer</span>
            <span className="text-foreground">PlantUML Server</span>
          </div>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">No PlantUML source available.</div>
      )}
    </BaseContent>
  );
}
