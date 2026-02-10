import { useEffect, useMemo, useState } from 'react';
import initSqlJs from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { BaseContent } from '../registryComponents';
import type { FileTypeContentProps } from './types';
import type { SpringstackNode } from '../types';

interface SqliteNodeData {
  url?: string;
  tableCount?: number;
  fileSize?: number;
}

interface TableInfo {
  name: string;
  rowCount: number;
  columnCount: number;
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

const listTables = (db: any): TableInfo[] => {
  const results = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;");
  if (!results[0]) return [];
  return results[0].values.map((row: any[]) => {
    const name = String(row[0]);
    const countResult = db.exec(`SELECT COUNT(*) as count FROM \"${name}\";`);
    const rowCount = countResult[0]?.values?.[0]?.[0] ? Number(countResult[0].values[0][0]) : 0;
    const columnsResult = db.exec(`PRAGMA table_info(\"${name}\");`);
    const columnCount = columnsResult[0]?.values?.length ?? 0;
    return { name, rowCount, columnCount };
  });
};

export function SqliteContent<TData extends SqliteNodeData = SqliteNodeData>({
  node,
  icon,
  detailLine,
  helpers
}: FileTypeContentProps<TData>) {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<{ version?: string; pageSize?: number }>({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!node.data?.url) return;
      setLoading(true);
      setError(null);
      try {
        const db = await loadDatabase(node.data.url);
        const tablesList = listTables(db);
        const version = db.exec('SELECT sqlite_version() as version;')[0]?.values?.[0]?.[0];
        const pageSize = db.exec('PRAGMA page_size;')[0]?.values?.[0]?.[0];
        db.close();
        if (cancelled) return;
        setTables(tablesList);
        setMetadata({
          version: version ? String(version) : undefined,
          pageSize: pageSize ? Number(pageSize) : undefined
        });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to read database');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [node.data?.url]);

  const tableCards = useMemo(() => {
    return tables.map(table => ({
      ...table,
      node: {
        id: `${node.id}:${table.name}`,
        kind: 'application/x-sqlite3-table',
        title: table.name,
        data: {
          tableName: table.name,
          rowCount: table.rowCount,
          columnCount: table.columnCount,
          dbUrl: node.data?.url,
          tableId: table.name
        }
      } as SpringstackNode<any>
    }));
  }, [tables, node.id, node.data?.url]);

  return (
    <BaseContent node={node} icon={icon} detailLine={detailLine} data-testid="file-sqlite">
      {loading ? (
        <div className="text-xs text-muted-foreground">Loading database…</div>
      ) : error ? (
        <div className="text-xs text-destructive">{error}</div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid gap-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Tables</span>
              <span className="text-foreground">{tables.length || node.data?.tableCount || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>SQLite</span>
              <span className="text-foreground">{metadata.version ?? 'Unknown'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Page size</span>
              <span className="text-foreground">{metadata.pageSize ? `${metadata.pageSize} bytes` : 'Unknown'}</span>
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {tableCards.map(table => (
              <button
                key={table.name}
                type="button"
                className="flex w-full items-start justify-between gap-2 rounded-md border border-muted-foreground/20 bg-card px-3 py-2 text-left text-xs transition-colors hover:bg-muted"
                onClick={(event) => {
                  if (!helpers) return;
                  helpers.push(table.node, event.currentTarget);
                }}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-foreground">{table.name}</span>
                  <span className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">Table</span>
                </div>
                <div className="flex flex-col items-end text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                  <span>{table.rowCount} rows</span>
                  <span>{table.columnCount} cols</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </BaseContent>
  );
}
