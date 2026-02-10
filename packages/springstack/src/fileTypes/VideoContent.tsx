import { BaseContent } from '../registryComponents';
import type { FileTypeContentProps } from './types';

interface VideoNodeData {
  url?: string;
  durationSec?: number;
}

export function VideoContent<TData extends VideoNodeData = VideoNodeData>({
  node,
  icon,
  detailLine
}: FileTypeContentProps<TData>) {
  const duration = node.data?.durationSec
    ? `${node.data.durationSec.toFixed(1)}s`
    : undefined;

  return (
    <BaseContent node={node} icon={icon} detailLine={detailLine} data-testid="file-video">
      {node.data?.url ? (
        <div className="flex flex-col gap-3">
          <video controls src={node.data.url} className="w-full rounded-md border border-muted-foreground/20" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Duration</span>
            <span className="text-foreground">{duration ?? 'Unknown'}</span>
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-muted-foreground/40 bg-card/60 p-3 text-xs text-muted-foreground">
          No video available.
        </div>
      )}
    </BaseContent>
  );
}
