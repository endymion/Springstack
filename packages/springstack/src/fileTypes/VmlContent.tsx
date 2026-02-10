import { useEffect, useMemo, useRef, useState } from 'react';
import { VideomlDomPlayer } from '@videoml/player/react';
import { BaseContent } from '../registryComponents';
import type { FileTypeContentProps } from './types';

interface VmlNodeData {
  url?: string;
  width?: number;
  height?: number;
  fps?: number;
  sceneCount?: number;
  durationSec?: number;
}

interface VmlMetadata {
  title?: string;
  width?: number;
  height?: number;
  fps?: number;
  sceneCount?: number;
  durationSec?: number;
}

const parseNumber = (value: string | null) => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseTimeValue = (value: string | null, fps: number) => {
  if (!value) return undefined;
  const text = value.trim();
  if (!text) return undefined;
  if (text.includes(':')) {
    const parts = text.split(':').map(part => Number(part));
    if (parts.some(part => Number.isNaN(part))) return undefined;
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (text.endsWith('s')) {
    const seconds = parseFloat(text.slice(0, -1));
    return Number.isFinite(seconds) ? seconds : undefined;
  }
  if (text.endsWith('f')) {
    const frames = parseFloat(text.slice(0, -1));
    return Number.isFinite(frames) ? frames / fps : undefined;
  }
  const numeric = parseFloat(text);
  return Number.isFinite(numeric) ? numeric : undefined;
};

const parseSceneDuration = (scene: Element, fps: number) => {
  const durationKeys = ['duration', 'durationSec', 'durationSeconds', 'seconds', 'time'];
  for (const key of durationKeys) {
    const value = parseTimeValue(scene.getAttribute(key), fps);
    if (value !== undefined) return value;
  }
  const frameKeys = ['durationFrames', 'frames'];
  for (const key of frameKeys) {
    const value = parseNumber(scene.getAttribute(key));
    if (value !== undefined) return value / fps;
  }

  const pauses = Array.from(scene.querySelectorAll('pause'));
  let total = 0;
  let found = false;
  for (const pause of pauses) {
    const seconds = parseTimeValue(pause.getAttribute('seconds'), fps)
      ?? parseTimeValue(pause.getAttribute('duration'), fps);
    if (seconds !== undefined) {
      total += seconds;
      found = true;
      continue;
    }
    const frames = parseNumber(pause.getAttribute('frames'));
    if (frames !== undefined) {
      total += frames / fps;
      found = true;
    }
  }
  return found ? total : undefined;
};

const parseVmlMetadata = (xml: string): VmlMetadata | null => {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const root = doc.querySelector('vml, videoml, video-ml');
  if (!root) return null;

  const fps = parseNumber(root.getAttribute('fps')) ?? 30;
  const width = parseNumber(root.getAttribute('width'));
  const height = parseNumber(root.getAttribute('height'));
  const title = root.getAttribute('title') ?? undefined;
  const scenes = Array.from(root.querySelectorAll('scene'));
  const sceneCount = scenes.length || undefined;

  let durationSec = 0;
  let hasDuration = false;
  for (const scene of scenes) {
    const duration = parseSceneDuration(scene, fps);
    if (duration !== undefined) {
      durationSec += duration;
      hasDuration = true;
    }
  }

  return {
    title,
    fps,
    width,
    height,
    sceneCount,
    durationSec: hasDuration ? durationSec : undefined
  };
};

const formatDuration = (durationSec?: number) => {
  if (!durationSec || durationSec <= 0) return undefined;
  const totalSeconds = Math.round(durationSec);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export function VmlContent<TData extends VmlNodeData = VmlNodeData>({
  node,
  icon,
  detailLine
}: FileTypeContentProps<TData>) {
  const [vmlXml, setVmlXml] = useState('');
  const [metadata, setMetadata] = useState<VmlMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(640);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!node.data?.url) return;
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(node.data.url);
        if (!response.ok) throw new Error('Failed to load VML');
        const text = await response.text();
        if (cancelled) return;
        setVmlXml(text);
        setMetadata(parseVmlMetadata(text));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load VML');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [node.data?.url]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const updateSize = () => {
      const width = element.getBoundingClientRect().width;
      if (width > 0) setContainerWidth(width);
    };
    updateSize();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateSize);
      return () => window.removeEventListener('resize', updateSize);
    }
    const observer = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width ?? 0;
      if (width > 0) setContainerWidth(width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const resolved = useMemo(() => {
    const data = node.data as VmlNodeData | undefined;
    return {
      title: metadata?.title,
      width: metadata?.width ?? data?.width,
      height: metadata?.height ?? data?.height,
      fps: metadata?.fps ?? data?.fps,
      sceneCount: metadata?.sceneCount ?? data?.sceneCount,
      durationSec: metadata?.durationSec ?? data?.durationSec
    };
  }, [metadata, node.data]);

  const aspectRatio = useMemo(() => {
    if (resolved.width && resolved.height) return resolved.height / resolved.width;
    return 9 / 16;
  }, [resolved.height, resolved.width]);

  const playerWidth = Math.max(280, Math.floor(containerWidth || 640));
  const playerHeight = Math.round(playerWidth * aspectRatio);

  return (
    <BaseContent node={node} icon={icon} detailLine={detailLine} data-testid="file-vml">
      {node.data?.url ? (
        <div className="flex flex-col gap-3">
          <div ref={containerRef} className="rounded-md border border-muted-foreground/20 bg-card p-2">
            {loading ? (
              <div className="text-xs text-muted-foreground">Loading VML composition…</div>
            ) : error ? (
              <div className="text-xs text-destructive">{error}</div>
            ) : vmlXml ? (
              <VideomlDomPlayer
                xml={vmlXml}
                width={playerWidth}
                height={playerHeight}
                autoPlay={false}
                clockMode="bounded"
                loop={false}
              />
            ) : (
              <div className="text-xs text-muted-foreground">No VML content available.</div>
            )}
          </div>

          <div className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
            <div className="flex items-center justify-between">
              <span>Resolution</span>
              <span className="text-foreground">
                {resolved.width && resolved.height ? `${resolved.width}×${resolved.height}` : 'Unknown'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>FPS</span>
              <span className="text-foreground">{resolved.fps ?? 'Unknown'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Scenes</span>
              <span className="text-foreground">{resolved.sceneCount ?? 'Unknown'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Duration</span>
              <span className="text-foreground">{formatDuration(resolved.durationSec) ?? 'Unknown'}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">No VML file available.</div>
      )}
    </BaseContent>
  );
}
