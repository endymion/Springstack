import { useEffect, useMemo, useState } from 'react';
import { BaseContent } from '../registryComponents';
import type { FileTypeContentProps } from './types';

interface ExcalidrawNodeData {
  url?: string;
  elementCount?: number;
}

interface ExcalidrawFile {
  type: string;
  version: number;
  source?: string;
  elements: unknown[];
  appState?: Record<string, unknown>;
  files?: Record<string, unknown>;
}

export function ExcalidrawContent<TData extends ExcalidrawNodeData = ExcalidrawNodeData>({
  node,
  icon,
  detailLine
}: FileTypeContentProps<TData>) {
  const [data, setData] = useState<ExcalidrawFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ExcalidrawComponent, setExcalidrawComponent] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    const loadComponent = async () => {
      try {
        const mod = await import('@excalidraw/excalidraw');
        if (!cancelled) setExcalidrawComponent(() => mod.Excalidraw);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load Excalidraw');
      }
    };
    const load = async () => {
      if (!node.data?.url) return;
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(node.data.url);
        if (!response.ok) throw new Error('Failed to load Excalidraw file');
        const text = await response.text();
        const parsed = JSON.parse(text) as ExcalidrawFile;
        if (!cancelled) setData(parsed);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load Excalidraw');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadComponent();
    void load();
    return () => {
      cancelled = true;
    };
  }, [node.data?.url]);

  const initialData = useMemo(() => {
    if (!data) return null;
    return {
      elements: data.elements ?? [],
      appState: {
        viewBackgroundColor: '#f8fafc',
        ...(data.appState ?? {})
      },
      files: data.files ?? {},
      scrollToContent: true
    } as any;
  }, [data]);

  return (
    <BaseContent node={node} icon={icon} detailLine={detailLine} data-testid="file-excalidraw">
      {node.data?.url ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-md border border-muted-foreground/20 bg-card p-2">
            {loading ? (
              <div className="text-xs text-muted-foreground">Loading Excalidraw scene…</div>
            ) : error ? (
              <div className="text-xs text-destructive">{error}</div>
            ) : !ExcalidrawComponent ? (
              <div className="text-xs text-muted-foreground">Loading Excalidraw renderer…</div>
            ) : initialData ? (
              <div className="h-[420px]">
                <ExcalidrawComponent
                  initialData={initialData}
                  viewModeEnabled
                  zenModeEnabled
                  gridModeEnabled={false}
                  UIOptions={{
                    canvasActions: {
                      changeViewBackgroundColor: false,
                      clearCanvas: false,
                      export: false,
                      loadScene: false,
                      saveAsImage: false,
                      saveToActiveFile: false,
                      toggleTheme: false
                    }
                  }}
                />
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">No Excalidraw data available.</div>
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Mode</span>
            <span className="text-foreground">View only</span>
          </div>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">No Excalidraw file available.</div>
      )}
    </BaseContent>
  );
}
