import { useEffect, useState } from 'react';
import initSqlJs from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { BaseContent } from '../registryComponents';
import type { FileTypeContentProps } from './types';

interface SqliteTableNodeData {
  tableName?: string;
  rowCount?: number;
  columnCount?: number;
  dbUrl?: string;
}

let sqlInitPromise: Promise<any> | null = null;

const getSql = async () => {
  if (!sqlInitPromise) {
    sqlInitPromise = initSqlJs({
      locateFile: () => sqlWasmUrl
    });
  }
  return sqlInitPromise;
};

const loadDatabase = async (url: string) => {
  const SQL = await getSql();
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to load database');
  const buffer = await response.arrayBuffer();
  return new SQL.Database(new Uint8Array(buffer));
};

export function SqliteTableContent<TData extends SqliteTableNodeData = SqliteTableNodeData>({
  node,
  icon,
  detailLine
}: FileTypeContentProps<TData>) {
  const [columns, setColumns] = useState<Array<{ name: string; type: string; notnull: boolean; pk: boolean }>>([]);
  const [rows, setRows] = useState<Array<Array<string | number | null>>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!node.data?.dbUrl || !node.data?.tableName) return;
      setLoading(true);
      setError(null);
      try {
        const db = await loadDatabase(node.data.dbUrl);
        const infoResult = db.exec(`PRAGMA table_info(\"${node.data.tableName}\");`);
        const infoRows = infoResult[0]?.values ?? [];
        const columnList = infoRows.map((row: any[]) => ({
          name: String(row[1]),
          type: String(row[2]),
          notnull: Boolean(row[3]),
          pk: Boolean(row[5])
        }));
        const dataResult = db.exec(`SELECT * FROM \"${node.data.tableName}\" LIMIT 20;`);
        const dataRows = dataResult[0]?.values ?? [];
        db.close();
        if (!cancelled) {
          setColumns(columnList);
          setRows(dataRows as Array<Array<string | number | null>>);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to read table');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [node.data?.dbUrl, node.data?.tableName]);

  return (
    <BaseContent node={node} icon={icon} detailLine={detailLine} data-testid="file-sqlite-table">
      {loading ? (
        <div className="text-xs text-muted-foreground">Loading table…</div>
      ) : error ? (
        <div className="text-xs text-destructive">{error}</div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid gap-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Rows</span>
              <span className="text-foreground">{node.data?.rowCount ?? rows.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Columns</span>
              <span className="text-foreground">{node.data?.columnCount ?? columns.length}</span>
            </div>
          </div>

          <div className="rounded-md border border-muted-foreground/20 bg-card p-2">
            <div className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Schema</div>
            <div className="grid gap-1 text-xs">
              {columns.map(column => (
                <div key={column.name} className="flex items-center justify-between">
                  <span className="text-foreground">{column.name}</span>
                  <span className="text-muted-foreground">
                    {column.type}{column.pk ? ' · pk' : ''}{column.notnull ? ' · not null' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-muted-foreground/20 bg-card">
            <div className="border-b border-muted-foreground/20 px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Preview rows
            </div>
            <div className="overflow-auto">
              <table className="min-w-full text-xs text-foreground">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    {columns.map(column => (
                      <th key={column.name} className="px-3 py-2 text-left font-medium">
                        {column.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-t border-muted-foreground/10">
                      {row.map((value, colIndex) => (
                        <td key={colIndex} className="px-3 py-2 text-foreground/90">
                          {value === null ? 'null' : String(value)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </BaseContent>
  );
}
