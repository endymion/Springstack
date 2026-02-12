import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { codeToHtml } from 'shiki/bundle/web';
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
  const [highlighted, setHighlighted] = useState('');
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
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

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      if (!markdown) {
        setHighlighted('');
        return;
      }
      try {
        const html = await codeToHtml(markdown, { lang: 'markdown', theme: 'github-dark' });
        if (!cancelled) setHighlighted(html);
      } catch {
        try {
          const html = await codeToHtml(markdown, { lang: 'text', theme: 'github-dark' });
          if (!cancelled) setHighlighted(html);
        } catch {
          if (!cancelled) {
            setHighlighted(
              `<pre><code>${markdown
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')}</code></pre>`
            );
          }
        }
      }
    };
    void render();
    return () => {
      cancelled = true;
    };
  }, [markdown]);

  const tabs = useMemo(
    () => [
      { id: 'preview' as const, label: 'Preview' },
      { id: 'code' as const, label: 'Code' }
    ],
    []
  );

  return (
    <BaseContent node={node} icon={icon} detailLine={detailLine} data-testid="file-markdown">
      {loading ? (
        <div className="text-xs text-muted-foreground">Loading markdown…</div>
      ) : error ? (
        <div className="text-xs text-destructive">{error}</div>
      ) : markdown ? (
        <div className="flex flex-col gap-3">
          <div className="flex w-fit items-center rounded-md border border-muted-foreground/20 bg-muted p-1 text-xs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={
                  activeTab === tab.id
                    ? 'rounded-md bg-card px-3 py-1 text-foreground shadow-sm'
                    : 'rounded-md px-3 py-1 text-muted-foreground hover:text-foreground'
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
          {activeTab === 'preview' ? (
            <article className="space-y-3 text-sm text-foreground">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
            </article>
          ) : (
            <div className="overflow-x-auto rounded-md border border-muted-foreground/20 bg-card">
              <div dangerouslySetInnerHTML={{ __html: highlighted }} />
            </div>
          )}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">No markdown available.</div>
      )}
    </BaseContent>
  );
}
