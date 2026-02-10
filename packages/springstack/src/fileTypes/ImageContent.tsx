import { BaseContent } from '../registryComponents';
import type { FileTypeContentProps } from './types';

interface ImageNodeData {
  url?: string;
  width?: number;
  height?: number;
}

export function ImageContent<TData extends ImageNodeData = ImageNodeData>({
  node,
  icon,
  detailLine
}: FileTypeContentProps<TData>) {
  const width = node.data?.width;
  const height = node.data?.height;

  return (
    <BaseContent node={node} icon={icon} detailLine={detailLine} data-testid="file-image">
      {node.data?.url ? (
        <div className="flex flex-col gap-3">
          <img
            src={node.data.url}
            alt={node.title ?? 'Image'}
            className="w-full rounded-md border border-muted-foreground/20 bg-card object-contain"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Dimensions</span>
            <span className="text-foreground">
              {width && height ? `${width} × ${height}` : 'Unknown'}
            </span>
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-muted-foreground/40 bg-card/60 p-3 text-xs text-muted-foreground">
          No image available.
        </div>
      )}
    </BaseContent>
  );
}
