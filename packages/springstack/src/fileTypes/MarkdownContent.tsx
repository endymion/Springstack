import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BaseContent } from '../registryComponents';
import type { FileTypeContentProps } from './types';

interface MarkdownNodeData {
  url?: string;
}

export function MarkdownContent<TData extends MarkdownNodeData = MarkdownNodeData>({
  node,
  icon,
  detailLine
}: FileTypeContentProps<TData>) {
  const [markdown, setMarkdown] = useState<string>('');
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
        if (!response.ok) throw new Error('Failed to load markdown');
        const text = await response.text();
        if (!cancelled) setMarkdown(text);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [node.data?.url]);

  return (
    <BaseContent node={node} icon={icon} detailLine={detailLine} data-testid="file-markdown">
      {loading ? (
        <div className="text-xs text-muted-foreground">Loading markdown…</div>
      ) : error ? (
        <div className="text-xs text-destructive">{error}</div>
      ) : markdown ? (
        <article className="space-y-3 text-sm text-foreground">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
        </article>
      ) : (
        <div className="text-xs text-muted-foreground">No markdown available.</div>
      )}
    </BaseContent>
  );
}
