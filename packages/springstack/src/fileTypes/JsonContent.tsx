import { useEffect, useMemo, useState } from 'react';
import { codeToHtml } from 'shiki/bundle/web';
import { Code2, ListTree, ChevronRight, ChevronDown } from 'lucide-react';
import { BaseContent } from '../registryComponents';
import type { FileTypeContentProps } from './types';

interface JsonNodeData {
  url?: string;
  itemCount?: number;
}

type ViewMode = 'code' | 'tree';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

const typeLabel = (value: JsonValue) => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
};

const formatValue = (value: JsonValue) => {
  if (value === null) return 'null';
  if (typeof value === 'string') return `"${value}"`;
  return String(value);
};

const collectPaths = (value: JsonValue, path: string, paths: Set<string>) => {
  if (value && typeof value === 'object') {
    paths.add(path);
    const entries = Array.isArray(value) ? value.entries() : Object.entries(value);
    for (const [key, child] of entries) {
      const childPath = Array.isArray(value)
        ? `${path}[${key}]`
        : `${path}.${key}`;
      collectPaths(child as JsonValue, childPath, paths);
    }
  }
};

const matchesQuery = (key: string | null, value: JsonValue, query: string) => {
  if (!query) return true;
  const q = query.toLowerCase();
  if (key && key.toLowerCase().includes(q)) return true;
  if (typeof value === 'string') return value.toLowerCase().includes(q);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value).includes(q);
  if (value === null && 'null'.includes(q)) return true;
  return false;
};

const hasMatch = (value: JsonValue, query: string, key: string | null = null): boolean => {
  if (matchesQuery(key, value, query)) return true;
  if (value && typeof value === 'object') {
    const entries = Array.isArray(value) ? value.entries() : Object.entries(value);
    for (const [childKey, child] of entries) {
      const nextKey = Array.isArray(value) ? null : String(childKey);
      if (hasMatch(child as JsonValue, query, nextKey)) return true;
    }
  }
  return false;
};

export function JsonContent<TData extends JsonNodeData = JsonNodeData>({
  node,
  icon,
  detailLine
}: FileTypeContentProps<TData>) {
  const [mode, setMode] = useState<ViewMode>('code');
  const [jsonText, setJsonText] = useState('');
  const [jsonValue, setJsonValue] = useState<JsonValue | null>(null);
  const [highlighted, setHighlighted] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!node.data?.url) return;
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(node.data.url);
        if (!response.ok) throw new Error('Failed to load JSON');
        const text = await response.text();
        const parsed = JSON.parse(text) as JsonValue;
        const pretty = JSON.stringify(parsed, null, 2);
        const html = await codeToHtml(pretty, { lang: 'json', theme: 'github-dark' });
        if (cancelled) return;
        setJsonText(pretty);
        setJsonValue(parsed);
        setHighlighted(html);
        const paths = new Set<string>();
        collectPaths(parsed, 'root', paths);
        setExpanded(paths);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to parse JSON');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [node.data?.url]);

  const allPaths = useMemo(() => {
    if (!jsonValue) return new Set<string>();
    const paths = new Set<string>();
    collectPaths(jsonValue, 'root', paths);
    return paths;
  }, [jsonValue]);

  const toggleAll = (state: 'expand' | 'collapse') => {
    if (state === 'expand') {
      setExpanded(new Set(allPaths));
    } else {
      setExpanded(new Set(['root']));
    }
  };

  const renderNode = (value: JsonValue, path: string, key: string | null, depth: number) => {
    if (query && !hasMatch(value, query, key)) return null;
    const isObject = value && typeof value === 'object';
    const isArray = Array.isArray(value);
    const isExpanded = expanded.has(path);
    const children = isObject
      ? (isArray ? value.map((child, index) => ({ key: String(index), value: child })) : Object.entries(value))
      : [];

    return (
      <div key={path} className="flex flex-col">
        <div className="flex items-start gap-2 text-xs">
          {isObject ? (
            <button
              type="button"
              onClick={() => {
                setExpanded(prev => {
                  const next = new Set(prev);
                  if (next.has(path)) next.delete(path);
                  else next.add(path);
                  return next;
                });
              }}
              className="mt-0.5 text-muted-foreground"
            >
              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
          ) : (
            <span className="w-3" />
          )}
          <div className="flex flex-1 items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {key !== null ? <span className="text-foreground">{key}</span> : <span className="text-foreground">root</span>}
              <span className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                {typeLabel(value)}
              </span>
            </div>
            {!isObject ? (
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => {
                  void navigator.clipboard.writeText(String(value));
                }}
              >
                {formatValue(value)}
              </button>
            ) : (
              <span className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                {isArray ? `[${children.length} items]` : `{${children.length} keys}`}
              </span>
            )}
          </div>
        </div>
        {isObject && isExpanded ? (
          <div className="ml-5 mt-2 border-l border-muted-foreground/20 pl-3">
            {children.map(([childKey, childValue]: any, index: number) => {
              const childPath = isArray
                ? `${path}[${childKey}]`
                : `${path}.${childKey}`;
              return renderNode(childValue as JsonValue, childPath, isArray ? null : String(childKey), depth + 1);
            })}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <BaseContent node={node} icon={icon} detailLine={detailLine} data-testid="file-json">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">JSON view</div>
        <div className="flex items-center gap-2">
          <input
            type="search"
            placeholder="Search keys or values"
            value={query}
            onChange={event => setQuery(event.target.value)}
            className="rounded-md border border-muted-foreground/30 bg-card px-2 py-1 text-xs text-foreground"
          />
          <button
            type="button"
            onClick={() => toggleAll('expand')}
            className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={() => toggleAll('collapse')}
            className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
          >
            Collapse all
          </button>
          <div className="flex items-center gap-1 rounded-full border border-muted-foreground/30 bg-card p-1 text-xs">
            <button
              type="button"
              onClick={() => setMode('code')}
              className={`flex items-center gap-1 rounded-full px-2 py-1 transition-colors ${
                mode === 'code' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Code2 className="h-3 w-3" />
              Code
            </button>
            <button
              type="button"
              onClick={() => setMode('tree')}
              className={`flex items-center gap-1 rounded-full px-2 py-1 transition-colors ${
                mode === 'tree' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ListTree className="h-3 w-3" />
              Tree
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-xs text-muted-foreground">Loading JSON…</div>
      ) : error ? (
        <div className="text-xs text-destructive">{error}</div>
      ) : mode === 'code' ? (
        <div className="rounded-md border border-muted-foreground/20 bg-card">
          <div className="flex items-center justify-between border-b border-muted-foreground/20 px-3 py-2 text-xs text-muted-foreground">
            <span>JSON Source</span>
            <button
              type="button"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => {
                if (!jsonText) return;
                void navigator.clipboard.writeText(jsonText);
              }}
            >
              Copy
            </button>
          </div>
          <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: highlighted }} />
        </div>
      ) : (
        <div className="rounded-md border border-muted-foreground/20 bg-card p-3 text-xs text-foreground">
          {jsonValue ? renderNode(jsonValue, 'root', null, 0) : <div>No JSON loaded.</div>}
        </div>
      )}
    </BaseContent>
  );
}
