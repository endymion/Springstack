import { useEffect, useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import { codeToHtml } from 'shiki/bundle/web';
import { BaseContent } from '../registryComponents';
import type { FileTypeContentProps } from './types';

interface MermaidNodeData {
  url?: string;
  diagramType?: string;
}

let mermaidLoader: Promise<any> | null = null;
const loadMermaid = async () => {
  if (!mermaidLoader) {
    mermaidLoader = import('mermaid').then(mod => {
      const mermaid = mod.default ?? mod;
      mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' });
      return mermaid;
    });
  }
  return mermaidLoader;
};

const detectDiagramType = (source: string) => {
  const firstLine = source.split('\n').map(line => line.trim()).find(line => line.length > 0) ?? '';
  if (firstLine.startsWith('sequenceDiagram')) return 'Sequence Diagram';
  if (firstLine.startsWith('gantt')) return 'Gantt Chart';
  if (firstLine.startsWith('classDiagram')) return 'Class Diagram';
  if (firstLine.startsWith('stateDiagram')) return 'State Diagram';
  if (firstLine.startsWith('erDiagram')) return 'ER Diagram';
  if (firstLine.startsWith('pie')) return 'Pie Chart';
  if (firstLine.startsWith('gitGraph')) return 'Git Graph';
  if (firstLine.startsWith('flowchart') || firstLine.startsWith('graph')) return 'Flowchart';
  return undefined;
};

export function MermaidContent<TData extends MermaidNodeData = MermaidNodeData>({
  node,
  icon,
  detailLine
}: FileTypeContentProps<TData>) {
  const [svg, setSvg] = useState('');
  const [source, setSource] = useState('');
  const [highlighted, setHighlighted] = useState('');
  const [diagramType, setDiagramType] = useState<string | undefined>(node.data?.diagramType);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSource, setShowSource] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      if (!node.data?.url) return;
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(node.data.url);
        if (!response.ok) throw new Error('Failed to load Mermaid source');
        const text = await response.text();
        const mermaid = await loadMermaid();
        const id = `mermaid-${node.id}-${Math.random().toString(36).slice(2)}`;
        const result = await mermaid.render(id, text);
        const sanitized = DOMPurify.sanitize(result.svg, { USE_PROFILES: { svg: true, svgFilters: true } });
        const diagram = detectDiagramType(text);
        let html = '';
        try {
          html = await codeToHtml(text, { lang: 'mermaid', theme: 'github-dark' });
        } catch (highlightError) {
          try {
            html = await codeToHtml(text, { lang: 'text', theme: 'github-dark' });
          } catch {
            html = `<pre><code>${text
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')}</code></pre>`;
          }
        }
        if (cancelled) return;
        setSource(text);
        setSvg(sanitized);
        setDiagramType(diagram);
        setHighlighted(html);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to render Mermaid diagram');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void render();
    return () => {
      cancelled = true;
    };
  }, [node.data?.url, node.id]);

  const resolvedType = useMemo(() => diagramType ?? node.data?.diagramType, [diagramType, node.data?.diagramType]);

  return (
    <BaseContent node={node} icon={icon} detailLine={detailLine} data-testid="file-mermaid">
      {node.data?.url ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-md border border-muted-foreground/20 bg-card p-3">
            {loading ? (
              <div className="text-xs text-muted-foreground">Rendering Mermaid diagram…</div>
            ) : error ? (
              <div className="text-xs text-destructive">{error}</div>
            ) : svg ? (
              <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: svg }} />
            ) : (
              <div className="text-xs text-muted-foreground">No diagram available.</div>
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Diagram type</span>
            <span className="text-foreground">{resolvedType ?? 'Unknown'}</span>
          </div>
          <button
            type="button"
            onClick={() => setShowSource(prev => !prev)}
            className="text-left text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
          >
            {showSource ? 'Hide source' : 'Show source'}
          </button>
          {showSource ? (
            <div className="rounded-md border border-muted-foreground/20 bg-card">
              <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: highlighted }} />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">No Mermaid source available.</div>
      )}
    </BaseContent>
  );
}
