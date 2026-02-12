import { useEffect, useMemo, useRef, useState } from 'react';
import type { HTMLAttributes } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  FileStack,
  Play,
  RotateCcw,
  Settings
} from 'lucide-react';
import {
  Springstack,
  SpringstackSettings,
  useSpringstackAppearance,
  type SpringstackHelpers,
  type SpringstackNode,
  type SpringstackRenderers,
  type SpringstackTimingMode
} from 'springstack';
import { parsePathToStack, stackToPath } from '@/lib/routeUtils';
import { createDemoNodeTypeRegistry } from '@/lib/nodeTypes';

const ROOT_KIND = 'application/x-root';
const FOLDER_KIND = 'application/x-folder';
const DETAIL_KIND = 'application/x-detail';


export interface DemoNodeData {
  corpusId?: string;
  itemId?: string;
  mediaType?: string;
  sizeKb?: number;
  metaLine?: string;
  url?: string;
  width?: number;
  height?: number;
  fps?: number;
  durationSec?: number;
  sceneCount?: number;
  nodeCount?: number;
  edgeCount?: number;
  elementCount?: number;
  diagramType?: string;
  pageCount?: number;
  rowCount?: number;
  columnCount?: number;
  language?: string;
  lineCount?: number;
  itemCount?: number;
  fileSize?: number;
  compressionCodec?: string;
  tableCount?: number;
  tableId?: string;
  dbUrl?: string;
}

export interface Corpus {
  id: string;
  name: string;
  metaLine: string;
}

export interface CorpusItem {
  id: string;
  title: string;
  mediaType: string;
  sizeKb: number;
  url?: string;
  width?: number;
  height?: number;
  fps?: number;
  durationSec?: number;
  sceneCount?: number;
  nodeCount?: number;
  edgeCount?: number;
  elementCount?: number;
  diagramType?: string;
  pageCount?: number;
  rowCount?: number;
  columnCount?: number;
  language?: string;
  lineCount?: number;
  itemCount?: number;
}

export const demoCorpora: Corpus[] = [
  { id: 'c-docs', name: 'Documents', metaLine: '3 files · 498 KB' },
  { id: 'c-media', name: 'Media', metaLine: '5 files · 2.8 MB' },
  { id: 'c-data', name: 'Data & Code', metaLine: '7 files · 177 KB' },
  { id: 'c-diagrams', name: 'Diagrams', metaLine: '4 files · 10 KB' }
];

export const demoItems: Record<string, CorpusItem[]> = {
  'c-docs': [
    { id: 'md-report', title: 'Field Report', mediaType: 'text/markdown', sizeKb: 84, url: '/samples/report.md' },
    { id: 'pdf-dossier', title: 'Access Dossier', mediaType: 'application/pdf', sizeKb: 412, url: '/samples/dossier.pdf', pageCount: 2 },
    { id: 'notes', title: 'Meeting Notes', mediaType: 'text/plain', sizeKb: 2, url: '/samples/notes.txt' }
  ],
  'c-media': [
    { id: 'blur-photo', title: 'Photograph That Refuses to Focus', mediaType: 'image/png', sizeKb: 1240, url: '/samples/blur.png', width: 1024, height: 640 },
    { id: 'footsteps', title: 'Footsteps with No Source', mediaType: 'audio/wav', sizeKb: 520, url: '/samples/footsteps.wav', durationSec: 1.2 },
    { id: 'hallway-loop', title: 'Looped Hallway', mediaType: 'video/mp4', sizeKb: 980, url: '/samples/hallway.mp4', durationSec: 2.0 },
    { id: 'glyph', title: 'Vector Sigil', mediaType: 'image/svg+xml', sizeKb: 34, url: '/samples/sigil.svg', width: 640, height: 480 },
    { id: 'composition', title: 'Intro Sequence', mediaType: 'application/x-vml+xml', sizeKb: 8, url: '/samples/demo.vml', width: 1920, height: 1080, fps: 30, sceneCount: 3, durationSec: 45 }
  ],
  'c-data': [
    { id: 'crowd-log', title: 'Crowd Log', mediaType: 'text/csv', sizeKb: 18, url: '/samples/log.csv', rowCount: 6, columnCount: 3 },
    { id: 'roster-matrix', title: 'Roster Matrix', mediaType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', sizeKb: 45, url: '/samples/roster.xlsx', rowCount: 5, columnCount: 4 },
    { id: 'roster-json', title: 'Roster Snapshot', mediaType: 'application/json', sizeKb: 3, url: '/samples/roster.json', itemCount: 4 },
    { id: 'beacon-driver', title: 'Beacon Driver', mediaType: 'text/typescript', sizeKb: 12, url: '/samples/beacon.ts', language: 'typescript', lineCount: 18 },
    { id: 'asset-bundle', title: 'Asset Bundle', mediaType: 'application/zip', sizeKb: 76, url: '/samples/assets.zip', itemCount: 3 },
    { id: 'stack-db', title: 'Stack Records', mediaType: 'application/x-sqlite3', sizeKb: 20, url: '/samples/stack.db', tableCount: 4, fileSize: 20480 },
    { id: 'sensor-parquet', title: 'Sensor Readings', mediaType: 'application/x-parquet', sizeKb: 3, url: '/samples/data/sensors.parquet', rowCount: 50, columnCount: 6, fileSize: 2765, compressionCodec: 'snappy' }
  ],
  'c-diagrams': [
    { id: 'service-map', title: 'Service Map', mediaType: 'text/vnd.graphviz', sizeKb: 2, url: '/samples/diagrams/network.dot', nodeCount: 5, edgeCount: 6 },
    { id: 'handoff-flow', title: 'Handoff Flow', mediaType: 'text/x-plantuml', sizeKb: 3, url: '/samples/diagrams/sequence.puml', elementCount: 6 },
    { id: 'scene-sketch', title: 'Scene Sketch', mediaType: 'application/x-excalidraw+json', sizeKb: 4, url: '/samples/diagrams/story.excalidraw.json', elementCount: 4 },
    { id: 'ops-flow', title: 'Ops Flow', mediaType: 'text/x-mermaid', sizeKb: 1, url: '/samples/diagrams/flow.mmd', diagramType: 'Flowchart', lineCount: 12, language: 'mermaid' }
  ]
};

const mergeClass = (...classes: Array<string | undefined>) => classes.filter(Boolean).join(' ');
const formatDuration = (durationSec?: number) => {
  if (!durationSec || durationSec <= 0) return undefined;
  const totalSeconds = Math.round(durationSec);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};
const formatVmlLine = (item: CorpusItem) => {
  const parts = [
    item.width && item.height ? `${item.width}×${item.height}` : null,
    item.fps ? `${item.fps}fps` : null,
    item.sceneCount ? `${item.sceneCount} scenes` : null,
    formatDuration(item.durationSec)
  ].filter((part): part is string => Boolean(part));
  return parts.length ? parts.join(' · ') : undefined;
};

export const buildRootNode = (): SpringstackNode<DemoNodeData> => ({
  id: 'root',
  kind: ROOT_KIND,
  title: 'Library',
  data: { metaLine: `${demoCorpora.length} corpora` }
});

export const buildCorpusNode = (corpus: Corpus): SpringstackNode<DemoNodeData> => ({
  id: corpus.id,
  kind: FOLDER_KIND,
  title: corpus.name,
  data: { corpusId: corpus.id, metaLine: corpus.metaLine }
});

export const buildItemNode = (item: CorpusItem, corpus: Corpus): SpringstackNode<DemoNodeData> => ({
  id: item.id,
  kind: item.mediaType,
  title: item.title,
  data: {
    corpusId: corpus.id,
    itemId: item.id,
    mediaType: item.mediaType,
    sizeKb: item.sizeKb,
    url: item.url,
    width: item.width,
    height: item.height,
    fps: item.fps,
    durationSec: item.durationSec,
    sceneCount: item.sceneCount,
    nodeCount: item.nodeCount,
    edgeCount: item.edgeCount,
    elementCount: item.elementCount,
    diagramType: item.diagramType,
    pageCount: item.pageCount,
    rowCount: item.rowCount,
    columnCount: item.columnCount,
    language: item.language,
    lineCount: item.lineCount,
    itemCount: item.itemCount,
    fileSize: item.fileSize,
    compressionCodec: item.compressionCodec,
    metaLine: item.tableCount
      ? `${item.tableCount} tables · ${item.sizeKb} KB`
      : item.mediaType === 'application/x-parquet'
        ? `${item.rowCount ?? 0} rows · ${item.columnCount ?? 0} cols`
      : item.mediaType === 'application/x-vml+xml'
        ? formatVmlLine(item)
        : `${item.mediaType} · ${item.sizeKb} KB`
  }
});

export const buildDetailNode = (item: CorpusItem): SpringstackNode<DemoNodeData> => ({
  id: `detail-${item.id}`,
  kind: DETAIL_KIND,
  title: 'Detail View',
  data: { itemId: item.id, metaLine: 'Evidence pack' }
});

export const buildTableNode = (item: CorpusItem, tableId: string): SpringstackNode<DemoNodeData> => ({
  id: `table-${item.id}-${tableId}`,
  kind: 'application/x-sqlite3-table',
  title: tableId,
  data: {
    itemId: item.id,
    tableId,
    dbUrl: item.url,
    metaLine: 'SQLite table'
  }
});

const resolveCurrentCorpus = (stack: SpringstackNode<DemoNodeData>[]) => {
  const corpusNode = stack.find(node => node.data?.corpusId && node.kind === FOLDER_KIND);
  if (!corpusNode?.data?.corpusId) return null;
  return demoCorpora.find(corpus => corpus.id === corpusNode.data?.corpusId) ?? null;
};

const resolveCurrentItem = (stack: SpringstackNode<DemoNodeData>[], corpus: Corpus | null) => {
  const itemNode = stack.find(node => node.data?.itemId && node.kind !== DETAIL_KIND && node.kind !== FOLDER_KIND && node.kind !== ROOT_KIND);
  if (!itemNode?.data?.itemId || !corpus) return null;
  return (demoItems[corpus.id] ?? []).find(item => item.id === itemNode.data?.itemId) ?? null;
};

export function SpringstackDemo() {
  const { appearance, motion, setAppearance, setMotion } = useSpringstackAppearance();
  const { timingMode } = motion;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const registry = useMemo(createDemoNodeTypeRegistry, []);
  const renderers = useMemo<SpringstackRenderers<DemoNodeData>>(() => registry.toRenderers(), [registry]);

  useEffect(() => {
    const root = document.documentElement;
    const durationMap: Record<SpringstackTimingMode, number> = {
      normal: 220,
      reduced: 80,
      gratuitous: 220,
      slow: 880,
      off: 0
    };
    root.style.setProperty('--theme-transition-duration', `${durationMap[timingMode]}ms`);
    return () => {
      root.style.removeProperty('--theme-transition-duration');
    };
  }, [timingMode]);

  const selectorMotion = useMemo(() => {
    const baseDuration = 560;
    const baseEnter = 130;
    const presets: Record<SpringstackTimingMode, { durationMs: number; ease: string; enterDurationMs: number }> = {
      normal: { durationMs: baseDuration, ease: 'back.out(1.6)', enterDurationMs: baseEnter },
      reduced: { durationMs: 200, ease: 'power2.out', enterDurationMs: 80 },
      gratuitous: { durationMs: baseDuration, ease: 'elastic.out(1.6, 0.5)', enterDurationMs: baseEnter },
      slow: { durationMs: baseDuration * 4, ease: 'back.out(1.6)', enterDurationMs: baseEnter * 4 },
      off: { durationMs: 0, ease: 'none', enterDurationMs: 0 }
    };
    return presets[timingMode];
  }, [timingMode]);

  const handlePushNext = async (helpers: SpringstackHelpers<DemoNodeData>) => {
    const activeNode = helpers.stack[helpers.stack.length - 1];
    if (activeNode.kind === ROOT_KIND) {
      const corpus = demoCorpora[0];
      const sourceEl = rootRef.current?.querySelector(
        `[data-item-card][data-item-type="${FOLDER_KIND}"][data-item-id="${corpus.id}"]`
      ) as HTMLElement | null;
      await helpers.push(buildCorpusNode(corpus), sourceEl);
      return;
    }
    if (activeNode.kind === FOLDER_KIND) {
      const corpus = resolveCurrentCorpus(helpers.stack);
      const item = corpus ? (demoItems[corpus.id] ?? [])[0] : null;
      if (!item || !corpus) return;
      const sourceEl = rootRef.current?.querySelector(
        `[data-item-card][data-item-type="${item.mediaType}"][data-item-id="${item.id}"]`
      ) as HTMLElement | null;
      await helpers.push(buildItemNode(item, corpus), sourceEl);
      return;
    }
    if (activeNode.kind !== DETAIL_KIND) {
      const corpus = resolveCurrentCorpus(helpers.stack);
      const item = corpus ? resolveCurrentItem(helpers.stack, corpus) : null;
      if (!item) return;
      const sourceEl = rootRef.current?.querySelector(
        `[data-item-card][data-item-type="${DETAIL_KIND}"][data-item-id="detail-${item.id}"]`
      ) as HTMLElement | null;
      await helpers.push(buildDetailNode(item), sourceEl);
    }
  };

  const handleDeepLink = async (helpers: SpringstackHelpers<DemoNodeData>) => {
    const corpus = demoCorpora[1];
    const item = demoItems[corpus.id]?.[1];
    if (!item) return;
    const path = [buildRootNode(), buildCorpusNode(corpus), buildItemNode(item, corpus)];
    await helpers.drillTo(path);
  };

  const initialStack = useMemo(() => [buildRootNode()], []);
  const routing = useMemo(() => {
    const builders = { buildRootNode, buildCorpusNode, buildItemNode, buildDetailNode, buildTableNode };
    return {
      parse: (path: string) => parsePathToStack(path, demoCorpora, demoItems, builders) ?? [],
      serialize: (stack: SpringstackNode<DemoNodeData>[]) => stackToPath(stack, demoCorpora)
    };
  }, []);

  const ItemsPanel = ({
    helpers,
    currentCorpus,
    currentItems,
    className,
    ...rest
  }: HTMLAttributes<HTMLDivElement> & {
    helpers: SpringstackHelpers<DemoNodeData>;
    currentCorpus: Corpus | null;
    currentItems: CorpusItem[];
  }) => {
    useEffect(() => {
      if (helpers.activeDepth === 1 && currentCorpus) {
        helpers.notifyPanelReady(`corpus:${currentCorpus.id}:items`);
      }
    }, [helpers.activeDepth, currentCorpus]);

    return (
      <div
        {...helpers.getPanelProps(
          currentCorpus ? `corpus:${currentCorpus.id}:items` : 'corpus:unknown:items'
        )}
        {...rest}
        className={mergeClass('basis-full shrink-0', className)}
      >
        <div className="flex h-full flex-col gap-2 p-2">
          <div className="flex items-center justify-between font-eyebrow text-xs text-muted-foreground pl-7">
            <span>{currentItems.length} items in {currentCorpus?.name ?? '—'}</span>
          </div>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {currentItems.map(item => {
              if (!currentCorpus) return null;
              const node = buildItemNode(item, currentCorpus);
              const cardProps = helpers.getCardProps(node, {
                onSelect: (_node, sourceEl) => helpers.push(node, sourceEl)
              });
              const renderer = renderers.list?.[node.kind] ?? renderers.list?.default;
              return (
                <button
                  key={item.id}
                  type="button"
                  {...cardProps}
                  className={mergeClass(
                    'flex w-full items-start gap-1 rounded-md bg-muted p-2 text-left text-sm transition-colors hover:bg-hover',
                    cardProps.className
                  )}
                  data-enter-item
                >
                  <div data-card-shell="true" className=" flex w-full items-start gap-1">
                    <div data-card-content="true" className=" flex w-full items-start gap-1">
                      {renderer?.(node)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div ref={rootRef} className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute left-0 top-0 h-64 w-64 rounded-md bg-muted/60" />
      <div className="pointer-events-none absolute right-8 top-24 h-40 w-72 rounded-md bg-card/70" />
      <div className="pointer-events-none absolute bottom-10 left-16 h-32 w-56 rounded-md bg-muted/50" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-2 py-2">
        <Springstack<DemoNodeData>
          initialStack={initialStack}
          renderers={renderers}
          routing={routing}
          enterAnimation={{
            durationMs: selectorMotion.durationMs * 0.25,
            staggerMs:
              timingMode === 'slow'
                ? selectorMotion.durationMs * 0.6
                : timingMode === 'gratuitous'
                  ? selectorMotion.durationMs * 0.3
                  : timingMode === 'normal'
                    ? selectorMotion.durationMs * 0.22
                    : timingMode === 'reduced'
                      ? selectorMotion.durationMs * 0.15
                      : 0,
            selector: '[data-enter-item]'
          }}
          timingMode={timingMode}
          className="flex flex-1 flex-col"
          renderHeader={() => (
            <div className="flex items-center justify-between rounded-md bg-card p-2">
              <div className="flex items-center gap-1 font-headline text-sm font-semibold text-foreground pl-2">
                <FileStack className="mt-0.5 h-4 w-4 text-muted-foreground" strokeWidth={2.25} />
                Springstack
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="flex items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
              >
                <Settings className="h-4 w-4" strokeWidth={2.25} />
              </button>
            </div>
          )}
          renderOverlay={() =>
            settingsOpen ? (
              <SpringstackSettings
                open={settingsOpen}
                onOpenChange={setSettingsOpen}
                appearance={appearance}
                motion={motion}
                setAppearance={setAppearance}
                setMotion={setMotion}
                selectorMotion={selectorMotion}
              />
            ) : null
          }
          renderPanels={helpers => {
            const currentCorpus = resolveCurrentCorpus(helpers.stack);
            const currentItems = currentCorpus ? demoItems[currentCorpus.id] ?? [] : [];
            const currentItem = resolveCurrentItem(helpers.stack, currentCorpus);
            const currentItemNode = currentItem && currentCorpus ? buildItemNode(currentItem, currentCorpus) : null;
            const activeNode = helpers.stack[helpers.stack.length - 1];
            const detailTargetNode =
              activeNode?.kind === 'application/x-sqlite3-table'
                ? activeNode
                : currentItemNode;
            const detailRenderer = detailTargetNode
              ? registry.resolve(detailTargetNode.kind)
              : null;
            const detailLine = detailTargetNode ? registry.detailLineFor(detailTargetNode) : undefined;
            const detailContent =
              detailTargetNode && detailRenderer?.content
                ? detailRenderer.content(detailTargetNode, { ...detailRenderer, detailLine }, helpers)
                : null;

            return (
              <>
                <div className="basis-full shrink-0" {...helpers.getPanelProps('root:corpora')}>
                  <div className="flex h-full flex-col gap-2 p-2">
                    <div className="font-eyebrow text-xs text-muted-foreground pl-7">Corpora</div>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {demoCorpora.map(corpus => {
                      const node = buildCorpusNode(corpus);
                      const cardProps = helpers.getCardProps(node, {
                        onSelect: (_node, sourceEl) => helpers.push(node, sourceEl)
                      });
                      const renderer = renderers.list?.[node.kind] ?? renderers.list?.default;
                        return (
                          <button
                            key={corpus.id}
                            type="button"
                            {...cardProps}
                            className={mergeClass(
                              'flex w-full items-start gap-1 rounded-md bg-muted p-2 text-left text-sm transition-colors hover:bg-hover',
                              cardProps.className
                            )}
                            data-enter-item
                          >
                            <div data-card-shell="true" className=" flex w-full items-start gap-1">
                              <div data-card-content="true" className=" flex w-full items-start gap-1">
                                {renderer?.(node)}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <ItemsPanel helpers={helpers} currentCorpus={currentCorpus} currentItems={currentItems} />

                <div className="basis-full shrink-0" {...helpers.getPanelProps('item:detail')}>
                  <div className="flex h-full flex-col gap-2 p-2">
                    <div className="font-eyebrow text-xs text-muted-foreground pl-7">Item</div>
                    <div className="rounded-md bg-muted p-2">
                      {currentItemNode ? (
                        <div className="flex items-start gap-1">
                          {renderers.list?.[currentItemNode.kind]?.(currentItemNode) ?? renderers.list?.default?.(currentItemNode)}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">No item selected.</div>
                      )}
                    </div>
                    {currentItem && (() => {
                      const node = buildDetailNode(currentItem);
                      const cardProps = helpers.getCardProps(node, {
                        onSelect: (_node, sourceEl) => helpers.push(node, sourceEl)
                      });
                      const renderer = renderers.list?.[node.kind] ?? renderers.list?.default;
                      return (
                        <button
                          type="button"
                          {...cardProps}
                          className={mergeClass(
                            ' flex w-full items-start gap-1 rounded-md bg-muted p-2 text-left text-sm transition-colors hover:bg-hover',
                            cardProps.className
                          )}
                        >
                          <div data-card-shell="true" className=" flex w-full items-start gap-1">
                            <div data-card-content="true" className=" flex w-full items-start gap-1">
                              {renderer?.(node)}
                            </div>
                          </div>
                        </button>
                      );
                    })()}
                  </div>
                </div>

                <div className="basis-full shrink-0" {...helpers.getPanelProps('detail:evidence')}>
                  <div className="flex h-full flex-col gap-2 p-2">
                    <div className="font-eyebrow text-xs text-muted-foreground pl-7">Detail</div>
                    {currentItemNode ? (
                      <div className="flex flex-col gap-2">{detailContent}</div>
                    ) : (
                      <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                        Select an item to preview its file detail.
                      </div>
                    )}
                  </div>
                </div>
              </>
            );
          }}
          renderFooter={helpers => {
            const activeNode = helpers.stack[helpers.stack.length - 1];
            return (
              <>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <div className="font-eyebrow text-xs text-muted-foreground pl-7">Controls</div>
                  <button
                    type="button"
                    onClick={() => handlePushNext(helpers)}
                    disabled={helpers.isTransitioning || activeNode.kind === DETAIL_KIND}
                    className="flex items-center gap-2 rounded-md bg-card px-3 py-2 text-sm text-foreground transition-colors hover:bg-hover disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" strokeWidth={2.25} />
                    Push next level
                  </button>
                  <button
                    type="button"
                    onClick={helpers.pop}
                    disabled={helpers.isTransitioning || helpers.stack.length <= 1}
                    className="flex items-center gap-2 rounded-md bg-card px-3 py-2 text-sm text-foreground transition-colors hover:bg-hover disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" strokeWidth={2.25} />
                    Pop level
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeepLink(helpers)}
                    disabled={helpers.isTransitioning}
                    className="flex items-center gap-2 rounded-md bg-card px-3 py-2 text-sm text-foreground transition-colors hover:bg-hover disabled:opacity-40"
                  >
                    <Play className="h-4 w-4" strokeWidth={2.25} />
                    Load deep link
                  </button>
                  <button
                    type="button"
                    onClick={() => helpers.setStack([buildRootNode()])}
                    disabled={helpers.isTransitioning}
                    className="flex items-center gap-2 rounded-md bg-card px-3 py-2 text-sm text-foreground transition-colors hover:bg-hover disabled:opacity-40"
                  >
                    <RotateCcw className="h-4 w-4" strokeWidth={2.25} />
                    Reset
                  </button>
                </div>

              </>
            );
          }}
        />
      </div>

    </div>
  );
}
