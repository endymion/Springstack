import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FileStack,
  FileText,
  Folder,
  Layers,
  Link2,
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

type NodeKind = 'root' | 'corpus' | 'item' | 'detail';

export interface DemoNodeData {
  corpusId?: string;
  itemId?: string;
  mediaType?: string;
  sizeKb?: number;
  metaLine?: string;
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
}

export const demoCorpora: Corpus[] = [
  { id: 'c-archive', name: 'X-Files Cabinet A', metaLine: '13 locked folders · 4.4 GB' },
  { id: 'c-patristics', name: 'Vault of Unfiled Anomalies', metaLine: '9 sealed cases · 2.7 GB' },
  { id: 'c-iconography', name: 'Do Not Open Drawer', metaLine: '7 forbidden bundles · 1.9 GB' }
];

export const demoItems: Record<string, CorpusItem[]> = {
  'c-archive': [
    { id: 'i-001', title: 'Black Tape Memo', mediaType: 'text/markdown', sizeKb: 84 },
    { id: 'i-002', title: 'Locker Key That Opens Nothing', mediaType: 'application/pdf', sizeKb: 412 },
    { id: 'i-003', title: 'Redacted Map of the Basement', mediaType: 'text/plain', sizeKb: 29 }
  ],
  'c-patristics': [
    { id: 'i-101', title: 'Glow-in-the-Dark Moss Sample', mediaType: 'application/pdf', sizeKb: 732 },
    { id: 'i-102', title: 'Half-Finished Incident Log', mediaType: 'text/markdown', sizeKb: 56 },
    { id: 'i-103', title: 'Audio: Footsteps with No Source', mediaType: 'text/csv', sizeKb: 18 }
  ],
  'c-iconography': [
    { id: 'i-201', title: 'Photograph That Refuses to Focus', mediaType: 'image/png', sizeKb: 1240 },
    { id: 'i-202', title: 'Handwritten Warning: DO NOT STACK', mediaType: 'text/markdown', sizeKb: 67 },
    { id: 'i-203', title: 'Blueprint for a Door That Is Not There', mediaType: 'application/pdf', sizeKb: 503 }
  ]
};

const mergeClass = (...classes: Array<string | undefined>) => classes.filter(Boolean).join(' ');


export const buildRootNode = (): SpringstackNode<DemoNodeData> => ({
  id: 'root',
  kind: 'root',
  title: 'Library',
  data: { metaLine: `${demoCorpora.length} corpora` }
});

export const buildCorpusNode = (corpus: Corpus): SpringstackNode<DemoNodeData> => ({
  id: corpus.id,
  kind: 'corpus',
  title: corpus.name,
  data: { corpusId: corpus.id, metaLine: corpus.metaLine }
});

export const buildItemNode = (item: CorpusItem, corpus: Corpus): SpringstackNode<DemoNodeData> => ({
  id: item.id,
  kind: 'item',
  title: item.title,
  data: {
    corpusId: corpus.id,
    itemId: item.id,
    mediaType: item.mediaType,
    sizeKb: item.sizeKb,
    metaLine: `${item.mediaType} · ${item.sizeKb} KB`
  }
});

export const buildDetailNode = (item: CorpusItem): SpringstackNode<DemoNodeData> => ({
  id: `detail-${item.id}`,
  kind: 'detail',
  title: 'Detail View',
  data: { itemId: item.id, metaLine: 'Evidence pack' }
});

const resolveCurrentCorpus = (stack: SpringstackNode<DemoNodeData>[]) => {
  const corpusNode = stack.find(node => node.kind === 'corpus');
  if (!corpusNode?.data?.corpusId) return null;
  return demoCorpora.find(corpus => corpus.id === corpusNode.data?.corpusId) ?? null;
};

const resolveCurrentItem = (stack: SpringstackNode<DemoNodeData>[], corpus: Corpus | null) => {
  const itemNode = stack.find(node => node.kind === 'item');
  if (!itemNode?.data?.itemId || !corpus) return null;
  return (demoItems[corpus.id] ?? []).find(item => item.id === itemNode.data?.itemId) ?? null;
};

const buildRenderers = (): SpringstackRenderers<DemoNodeData> => {
  const renderCard = (icon: ReactNode, node: SpringstackNode<DemoNodeData>) => (
    <>
      {icon}
      <div className="flex flex-col">
        <span className="font-headline font-semibold text-foreground">{node.title}</span>
        {node.data?.metaLine && <span className="font-body text-xs text-muted-foreground">{node.data.metaLine}</span>}
      </div>
    </>
  );

  return {
    list: {
      root: node => renderCard(<BookOpen className="mt-0.5 h-4 w-4 text-muted-foreground" strokeWidth={2.25} />, node),
      corpus: node => renderCard(<Folder className="mt-0.5 h-4 w-4 text-muted-foreground" strokeWidth={2.25} />, node),
      item: node => renderCard(<FileText className="mt-0.5 h-4 w-4 text-muted-foreground" strokeWidth={2.25} />, node),
      detail: node => renderCard(<Link2 className="mt-0.5 h-4 w-4 text-muted-foreground" strokeWidth={2.25} />, node),
      default: node => renderCard(<Layers className="mt-0.5 h-4 w-4 text-muted-foreground" strokeWidth={2.25} />, node)
    },
    crumb: {
      root: node => renderCard(<BookOpen className="mt-0.5 h-4 w-4 text-muted-foreground" strokeWidth={2.25} />, node),
      corpus: node => renderCard(<Folder className="mt-0.5 h-4 w-4 text-muted-foreground" strokeWidth={2.25} />, node),
      item: node => renderCard(<FileText className="mt-0.5 h-4 w-4 text-muted-foreground" strokeWidth={2.25} />, node),
      detail: node => renderCard(<Link2 className="mt-0.5 h-4 w-4 text-muted-foreground" strokeWidth={2.25} />, node),
      default: node => renderCard(<Layers className="mt-0.5 h-4 w-4 text-muted-foreground" strokeWidth={2.25} />, node)
    }
  };
};

export function SpringstackDemo() {
  const { appearance, motion, setAppearance, setMotion } = useSpringstackAppearance();
  const { reduceMotion } = appearance;
  const { timingMode } = motion;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);
  const renderers = useMemo(buildRenderers, []);

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
    if (activeNode.kind === 'root') {
      const corpus = demoCorpora[0];
      const sourceEl = rootRef.current?.querySelector(
        `[data-item-card][data-item-type=\"corpus\"][data-item-id=\"${corpus.id}\"]`
      ) as HTMLElement | null;
      await helpers.push(buildCorpusNode(corpus), sourceEl);
      return;
    }
    if (activeNode.kind === 'corpus') {
      const corpus = resolveCurrentCorpus(helpers.stack);
      const item = corpus ? (demoItems[corpus.id] ?? [])[0] : null;
      if (!item || !corpus) return;
      const sourceEl = rootRef.current?.querySelector(
        `[data-item-card][data-item-type=\"item\"][data-item-id=\"${item.id}\"]`
      ) as HTMLElement | null;
      await helpers.push(buildItemNode(item, corpus), sourceEl);
      return;
    }
    if (activeNode.kind === 'item') {
      const corpus = resolveCurrentCorpus(helpers.stack);
      const item = corpus ? resolveCurrentItem(helpers.stack, corpus) : null;
      if (!item) return;
      const sourceEl = rootRef.current?.querySelector(
        `[data-item-card][data-item-type=\"detail\"][data-item-id=\"detail-${item.id}\"]`
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

  // Always start at root - we'll animate to deep link after mount
  const initialStack = useMemo(() => [buildRootNode()], []);

  // Parse URL and drill to target after mount
  const targetStackRef = useRef<SpringstackNode<DemoNodeData>[] | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const builders = { buildRootNode, buildCorpusNode, buildItemNode, buildDetailNode };
    const stack = parsePathToStack(window.location.pathname, demoCorpora, demoItems, builders);

    // Invalid URL - redirect to root
    if (!stack) {
      if (window.location.pathname !== '/') {
        window.history.replaceState(null, '', '/');
      }
      return;
    }

    // If it's not just root, store it for drillTo
    if (stack.length > 1) {
      targetStackRef.current = stack;
    }
  }, []);

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      // Simple fallback: reload page when user uses back/forward
      window.location.reload();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Store helpers ref for deep link navigation
  const helpersRef = useRef<SpringstackHelpers<DemoNodeData> | null>(null);
  const hasCalledDrillToRef = useRef(false);

  // Trigger deep link navigation exactly once on mount if needed
  useEffect(() => {
    // Only run if we have a deep link target AND haven't called drillTo yet
    if (!targetStackRef.current || hasCalledDrillToRef.current) {
      return;
    }

    // Mark as called IMMEDIATELY to prevent StrictMode double-invoke
    hasCalledDrillToRef.current = true;

    const targetStack = targetStackRef.current;
    let cancelled = false;

    // Wait for helpers to be available, then trigger drillTo
    const checkHelpers = () => {
      if (cancelled) return;

      if (helpersRef.current) {
        helpersRef.current.drillTo(targetStack);
        return; // STOP - we're done
      }

      requestAnimationFrame(checkHelpers);
    };

    requestAnimationFrame(checkHelpers);

    return () => {
      cancelled = true;
    };
  }, []); // Empty deps = run ONCE on mount (but StrictMode will run it twice)

  const ItemsPanel = ({
    helpers,
    currentCorpus,
    currentItems
  }: {
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
        className="basis-full shrink-0"
        {...helpers.getPanelProps(
          currentCorpus ? `corpus:${currentCorpus.id}:items` : 'corpus:unknown:items'
        )}
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
                      {(renderers.list?.item ?? renderers.list?.default)?.(node)}
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
          onStackChange={(stack) => {
            // Skip URL update on initial mount
            if (isInitialMount.current) {
              isInitialMount.current = false;
              return;
            }

            const newPath = stackToPath(stack, demoCorpora);
            if (typeof window !== 'undefined' && window.location.pathname !== newPath) {
              window.history.pushState(null, '', newPath);
            }
          }}
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
          renderOverlay={() => (
            <SpringstackSettings
              open={settingsOpen}
              onOpenChange={setSettingsOpen}
              appearance={appearance}
              motion={motion}
              setAppearance={setAppearance}
              setMotion={setMotion}
              selectorMotion={selectorMotion}
            />
          )}
          renderPanels={helpers => {
            // Store helpers reference for deep link navigation (only once)
            if (!helpersRef.current) {
              helpersRef.current = helpers;
            }

            const currentCorpus = resolveCurrentCorpus(helpers.stack);
            const currentItems = currentCorpus ? demoItems[currentCorpus.id] ?? [] : [];
            const currentItem = resolveCurrentItem(helpers.stack, currentCorpus);

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
                                {(renderers.list?.corpus ?? renderers.list?.default)?.(node)}
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
                      <div className="flex items-start gap-1">
                        <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" strokeWidth={2.25} />
                        <div className="font-headline text-sm font-semibold text-foreground">{currentItem?.title ?? '—'}</div>
                      </div>
                      <div className="font-body mt-2 text-xs text-muted-foreground">
                        {currentItem?.mediaType ?? '—'} · {currentItem?.sizeKb ?? 0} KB
                      </div>
                    </div>
                    {currentItem && (() => {
                      const node = buildDetailNode(currentItem);
                      const cardProps = helpers.getCardProps(node, {
                        onSelect: (_node, sourceEl) => helpers.push(node, sourceEl)
                      });
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
                              {(renderers.list?.detail ?? renderers.list?.default)?.(node)}
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
                    <div className="flex flex-col gap-2 rounded-md bg-muted p-2">
                      <div className="flex items-start gap-1">
                        <Layers className="mt-0.5 h-4 w-4 text-muted-foreground" strokeWidth={2.25} />
                        <span className="text-sm font-semibold text-foreground">Evidence pack</span>
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        {['Primary excerpt', 'Provenance', 'Context budget', 'Rerank trace'].map(label => (
                          <div key={label} className="rounded-md bg-card p-2 text-xs text-muted-foreground">
                            {label}
                          </div>
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground">This panel is the terminal node. Pop to return.</div>
                    </div>
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
                    disabled={helpers.isTransitioning || activeNode.kind === 'detail'}
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
