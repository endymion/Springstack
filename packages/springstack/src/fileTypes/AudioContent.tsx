import { BaseContent } from '../registryComponents';
import type { FileTypeContentProps } from './types';

interface AudioNodeData {
  url?: string;
  durationSec?: number;
}

export function AudioContent<TData extends AudioNodeData = AudioNodeData>({
  node,
  icon,
  detailLine
}: FileTypeContentProps<TData>) {
  const duration = node.data?.durationSec
    ? `${node.data.durationSec.toFixed(1)}s`
    : undefined;

  return (
    <BaseContent node={node} icon={icon} detailLine={detailLine} data-testid="file-audio">
      {node.data?.url ? (
        <div className="flex flex-col gap-3">
          <audio controls src={node.data.url} className="w-full" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Duration</span>
            <span className="text-foreground">{duration ?? 'Unknown'}</span>
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-muted-foreground/40 bg-card/60 p-2 text-xs text-muted-foreground">
          No audio available.
        </div>
      )}
    </BaseContent>
  );
}
