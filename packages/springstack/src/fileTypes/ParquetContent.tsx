import { useEffect, useMemo, useState } from 'react';
import arrow2WasmUrl from 'parquet-wasm/esm2/arrow2_bg.wasm?url';
import { BaseContent } from '../registryComponents';
import type { FileTypeContentProps } from './types';

interface ParquetNodeData {
  url?: string;
  rowCount?: number;
  columnCount?: number;
  fileSize?: number;
  compressionCodec?: string;
}

interface ParquetMeta {
  rowGroups?: number;
  createdBy?: string;
}

const formatNumber = (value: number) => value.toLocaleString();

const formatValue = (value: unknown) => {
  if (value === null || value === undefined) return '—';
  if (value instanceof Date) return value.toLocaleString();
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
};

const compareValues = (a: unknown, b: unknown) => {
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'bigint' && typeof b === 'bigint') return Number(a - b);
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
  return String(a).localeCompare(String(b));
};

export function ParquetContent<TData extends ParquetNodeData = ParquetNodeData>({
  node,
  icon,
  detailLine
}: FileTypeContentProps<TData>) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [columns, setColumns] = useState<Array<{ name: string; type: string; nullable: boolean }>>([]);
  const [meta, setMeta] = useState<ParquetMeta | null>(null);
  const [counts, setCounts] = useState<{ rows: number; columns: number }>({ rows: 0, columns: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!node.data?.url) return;
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(node.data.url);
        if (!response.ok) throw new Error('Failed to load Parquet file');
        const buffer = await response.arrayBuffer();
        const parquet = await import('parquet-wasm/esm2/arrow2');
        if (parquet.default) {
          const wasmResponse = await fetch(arrow2WasmUrl);
          if (!wasmResponse.ok) throw new Error('Failed to load Parquet WASM');
          const wasmBytes = await wasmResponse.arrayBuffer();
          await parquet.default(wasmBytes);
        }
        const arrow = await import('apache-arrow');
        const parquetData = new Uint8Array(buffer);
        const table = arrow.tableFromIPC(parquet.readParquet(parquetData));
        const metadata = parquet.readMetadata(parquetData);
        const fields = table.schema.fields.map((field: any) => ({
          name: field.name,
          type: field.type?.toString?.() ?? 'unknown',
          nullable: field.nullable
        }));
        const previewRows = table.toArray().slice(0, 100) as Record<string, unknown>[];

        const rowGroups = metadata.numRowGroups();
        const createdBy = metadata.createdBy();
        metadata.free();

        if (cancelled) return;
        setColumns(fields);
        setRows(previewRows);
        setCounts({ rows: table.numRows, columns: table.numCols });
        setMeta({ rowGroups, createdBy });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to parse Parquet');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [node.data?.url]);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const sorted = [...rows].sort((a, b) => compareValues(a[sort.key], b[sort.key]));
    if (sort.direction === 'desc') sorted.reverse();
    return sorted;
  }, [rows, sort]);

  const handleSort = (key: string) => {
    setSort(prev => {
      if (!prev || prev.key !== key) return { key, direction: 'asc' };
      return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
    });
  };

  const rowCount = counts.rows || node.data?.rowCount || 0;
  const columnCount = counts.columns || node.data?.columnCount || 0;

  return (
    <BaseContent node={node} icon={icon} detailLine={detailLine} data-testid="file-parquet">
      {node.data?.url ? (
        <div className="flex flex-col gap-4">
          <div className="rounded-md border border-muted-foreground/20 bg-card p-3">
            <div className="mb-2 text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">Schema</div>
            {columns.length ? (
              <div className="grid gap-2 text-xs">
                {columns.map(column => (
                  <div key={column.name} className="flex items-center justify-between">
                    <span className="text-foreground">{column.name}</span>
                    <span className="text-muted-foreground">
                      {column.type}{column.nullable ? ' · nullable' : ''}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">No schema available.</div>
            )}
          </div>

          <div className="rounded-md border border-muted-foreground/20 bg-card p-3">
            <div className="mb-2 text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">Preview</div>
            {loading ? (
              <div className="text-xs text-muted-foreground">Loading Parquet data…</div>
            ) : error ? (
              <div className="text-xs text-destructive">{error}</div>
            ) : sortedRows.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground">
                    <tr>
                      {columns.map(column => (
                        <th key={column.name} className="px-2 py-1 text-left">
                          <button
                            type="button"
                            onClick={() => handleSort(column.name)}
                            className="font-semibold text-foreground"
                          >
                            {column.name}
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRows.map((row, index) => (
                      <tr key={index} className="border-t border-muted-foreground/10">
                        {columns.map(column => (
                          <td key={column.name} className="px-2 py-1 text-muted-foreground">
                            {formatValue(row[column.name])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">No rows to preview.</div>
            )}
          </div>

          <details className="rounded-md border border-muted-foreground/20 bg-card p-3 text-xs text-muted-foreground">
            <summary className="cursor-pointer text-[0.65rem] uppercase tracking-[0.2em]">Metadata</summary>
            <div className="mt-3 grid gap-2">
              <div className="flex items-center justify-between">
                <span>Rows</span>
                <span className="text-foreground">{rowCount ? formatNumber(rowCount) : 'Unknown'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Columns</span>
                <span className="text-foreground">{columnCount ? formatNumber(columnCount) : 'Unknown'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Row groups</span>
                <span className="text-foreground">{meta?.rowGroups ?? 'Unknown'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Created by</span>
                <span className="text-foreground">{meta?.createdBy ?? 'Unknown'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Compression</span>
                <span className="text-foreground">{node.data?.compressionCodec ?? 'Unknown'}</span>
              </div>
            </div>
          </details>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">No Parquet file available.</div>
      )}
    </BaseContent>
  );
}
