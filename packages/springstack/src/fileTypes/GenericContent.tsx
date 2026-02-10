import { BaseContent } from '../registryComponents';
import type { FileTypeContentProps } from './types';

interface GenericNodeData {
  url?: string;
  sizeKb?: number;
}

export function GenericContent<TData extends GenericNodeData = GenericNodeData>({
  node,
  icon,
  detailLine
}: FileTypeContentProps<TData>) {
  const size = node.data?.sizeKb ? `${node.data.sizeKb} KB` : 'Unknown size';

  return (
    <BaseContent node={node} icon={icon} detailLine={detailLine} className="gap-4" data-testid="file-generic">
      <div className="grid gap-2 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Type</span>
          <span className="text-foreground">{node.kind}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Size</span>
          <span className="text-foreground">{size}</span>
        </div>
      </div>
      <div className="rounded-md border border-dashed border-muted-foreground/40 bg-card/60 p-3 text-xs text-muted-foreground">
        No preview available for this file type.
      </div>
      {node.data?.url ? (
        <a
          href={node.data.url}
          download
          className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
        >
          Download file
        </a>
      ) : null}
    </BaseContent>
  );
}
