import { useEffect, useState } from 'react';
import JSZip from 'jszip';
import { BaseContent } from '../registryComponents';
import type { FileTypeContentProps } from './types';

interface ArchiveNodeData {
  url?: string;
  itemCount?: number;
}

export function ArchiveContent<TData extends ArchiveNodeData = ArchiveNodeData>({
  node,
  icon,
  detailLine
}: FileTypeContentProps<TData>) {
  const [items, setItems] = useState<string[]>([]);
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
        if (!response.ok) throw new Error('Failed to load archive');
        const buffer = await response.arrayBuffer();
        const zip = await JSZip.loadAsync(buffer);
        const names = Object.keys(zip.files).filter(name => !zip.files[name].dir);
        if (!cancelled) setItems(names);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to parse archive');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [node.data?.url]);

  const preview = items.slice(0, 5);

  return (
    <BaseContent node={node} icon={icon} detailLine={detailLine} data-testid="file-archive">
      {loading ? (
        <div className="text-xs text-muted-foreground">Loading archive…</div>
      ) : error ? (
        <div className="text-xs text-destructive">{error}</div>
      ) : (
        <div className="flex flex-col gap-3 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Files</span>
            <span className="text-foreground">{items.length || node.data?.itemCount || 0}</span>
          </div>
          {preview.length ? (
            <div className="rounded-md border border-muted-foreground/20 bg-card p-2">
              <div className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Preview
              </div>
              <ul className="space-y-1">
                {preview.map(name => (
                  <li key={name} className="truncate text-foreground">
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">Archive contents unavailable.</div>
          )}
        </div>
      )}
    </BaseContent>
  );
}
