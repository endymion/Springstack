import { useEffect, useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { BaseContent } from '../registryComponents';
import type { FileTypeContentProps } from './types';

interface SpreadsheetNodeData {
  url?: string;
  rowCount?: number;
  columnCount?: number;
}

const parseCsv = (text: string) => {
  const result = Papa.parse<string[]>(text.trim(), { skipEmptyLines: true });
  if (result.errors.length) return { rows: 0, cols: 0 };
  const rows = result.data.length;
  const cols = result.data[0]?.length ?? 0;
  return { rows, cols };
};

const parseXlsx = (buffer: ArrayBuffer) => {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) return { rows: 0, cols: 0 };
  const sheet = workbook.Sheets[firstSheet];
  const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1');
  return {
    rows: range.e.r - range.s.r + 1,
    cols: range.e.c - range.s.c + 1
  };
};

export function SpreadsheetContent<TData extends SpreadsheetNodeData = SpreadsheetNodeData>({
  node,
  icon,
  detailLine
}: FileTypeContentProps<TData>) {
  const [rows, setRows] = useState<number | null>(node.data?.rowCount ?? null);
  const [cols, setCols] = useState<number | null>(node.data?.columnCount ?? null);
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
        if (!response.ok) throw new Error('Failed to load spreadsheet');
        const isCsv = node.kind.includes('csv') || node.data.url.endsWith('.csv');
        if (isCsv) {
          const text = await response.text();
          const parsed = parseCsv(text);
          if (!cancelled) {
            setRows(parsed.rows);
            setCols(parsed.cols);
          }
        } else {
          const buffer = await response.arrayBuffer();
          const parsed = parseXlsx(buffer);
          if (!cancelled) {
            setRows(parsed.rows);
            setCols(parsed.cols);
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to parse');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [node.data?.url, node.kind]);

  return (
    <BaseContent node={node} icon={icon} detailLine={detailLine} data-testid="file-spreadsheet">
      {loading ? (
        <div className="text-xs text-muted-foreground">Loading spreadsheet…</div>
      ) : error ? (
        <div className="text-xs text-destructive">{error}</div>
      ) : (
        <div className="grid gap-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Rows</span>
            <span className="text-foreground">{rows ?? 'Unknown'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Columns</span>
            <span className="text-foreground">{cols ?? 'Unknown'}</span>
          </div>
        </div>
      )}
    </BaseContent>
  );
}
