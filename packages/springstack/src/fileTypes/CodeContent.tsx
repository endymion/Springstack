import { useEffect, useState } from 'react';
import { codeToHtml } from 'shiki/bundle/web';
import { BaseContent } from '../registryComponents';
import type { FileTypeContentProps } from './types';

interface CodeNodeData {
  url?: string;
  language?: string;
}

export function CodeContent<TData extends CodeNodeData = CodeNodeData>({
  node,
  icon,
  detailLine
}: FileTypeContentProps<TData>) {
  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!node.data?.url) return;
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(node.data.url);
        if (!response.ok) throw new Error('Failed to load code');
        const text = await response.text();
        const language = node.data?.language ?? 'typescript';
        const rendered = await codeToHtml(text, { lang: language, theme: 'github-dark' });
        if (!cancelled) setHtml(rendered);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to render code');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [node.data?.url, node.data?.language]);

  return (
    <BaseContent node={node} icon={icon} detailLine={detailLine} data-testid="file-code">
      {loading ? (
        <div className="text-xs text-muted-foreground">Loading code…</div>
      ) : error ? (
        <div className="text-xs text-destructive">{error}</div>
      ) : html ? (
        <div
          className="overflow-hidden rounded-md border border-muted-foreground/20 bg-card"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <div className="text-xs text-muted-foreground">No code available.</div>
      )}
    </BaseContent>
  );
}
