import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import type {
  SpringstackHelpers,
  SpringstackProps,
  SpringstackNode,
  SpringstackRenderers,
  SpringstackSlotRenderer,
  SpringstackEnterAnimationConfig
} from './types';
import { useSpringstackController } from './useSpringstackController';

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

const getSlotRenderer = <TData,>(
  node: SpringstackNode<TData>,
  slot: keyof SpringstackRenderers<TData>,
  renderers?: SpringstackRenderers<TData>
): SpringstackSlotRenderer<TData> | undefined => {
  const localSlot = node.slots?.[slot];
  if (localSlot) return localSlot;
  const byKind = renderers?.[slot]?.[node.kind];
  if (byKind) return byKind;
  return renderers?.[slot]?.default;
};

const getShellElement = (element: HTMLElement) => {
  if (element.matches('[data-card-shell]')) return element;
  return element.querySelector('[data-card-shell]') as HTMLElement | null;
};

const getContentElement = (element: HTMLElement) => {
  if (element.matches('[data-card-content]')) return element;
  return element.querySelector('[data-card-content]') as HTMLElement | null;
};

const createGhostOverlay = () => {
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.left = '0';
  overlay.style.top = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.pointerEvents = 'none';
  overlay.style.zIndex = '10000';
  document.body.appendChild(overlay);
  return overlay;
};

const prepareGhost = (shell: HTMLElement) => {
  const overlay = createGhostOverlay();
  const shellRect = shell.getBoundingClientRect();
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = `${shellRect.left}px`;
  wrapper.style.top = `${shellRect.top}px`;
  wrapper.style.width = `${shellRect.width}px`;
  wrapper.style.height = `${shellRect.height}px`;
  wrapper.style.margin = '0';
  wrapper.style.transform = 'none';
  wrapper.style.transformOrigin = 'top left';
  wrapper.style.pointerEvents = 'none';
  overlay.appendChild(wrapper);
  const shellClone = shell.cloneNode(true) as HTMLElement;
  gsap.set(shellClone, { force3D: true });
  shellClone.style.position = 'absolute';
  shellClone.style.left = '0';
  shellClone.style.top = '0';
  shellClone.style.width = '100%';
  shellClone.style.height = '100%';
  shellClone.style.margin = '0';
  shellClone.style.transformOrigin = 'top left';
  shellClone.style.overflow = 'hidden';
  shellClone.style.boxSizing = 'border-box';
  wrapper.appendChild(shellClone);
  return {
    overlay,
    wrapper,
    shellClone,
    shellRect
  };
};

export function Springstack<TData>(props: SpringstackProps<TData>) {
  const {
    initialStack,
    renderPanels,
    renderHeader,
    renderFooter,
    renderOverlay,
    renderers,
    enterAnimation,
    timingMode: timingModeProp,
    timingConfig: timingConfigProp,
    className,
    onStackChange
  } = props;

  const controller = useSpringstackController<TData>({
    initialStack,
    timingMode: timingModeProp,
    timingConfig: timingConfigProp,
    onStackChange
  });

  const { stack, activeDepth, isTransitioning, timingConfig, queueTick } = controller;
  const [isMorphing, setIsMorphing] = useState(false);
  const [isDeepLinking, setIsDeepLinking] = useState(false);
  const [hiddenCardId, setHiddenCardId] = useState<string | null>(null);
  const [hiddenCardDepth, setHiddenCardDepth] = useState<number | null>(null);
  const [morphing, setMorphing] = useState<{
    kind: string;
    id: string;
    direction: 'toCrumb' | 'toList';
  } | null>(null);
  const navDirectionRef = useRef<'forward' | 'back' | 'none'>('none');

  const containerRef = useRef<HTMLDivElement>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);
  const breadcrumbRowRef = useRef<HTMLDivElement>(null);
  const breadcrumbWrapperRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const panelWidthRef = useRef(0);
  const skipAutoTrackTweenRef = useRef(false);
  const panelRefsRef = useRef(new Map<string, HTMLDivElement>());

  const helpers: SpringstackHelpers<TData> = useMemo(
    () => ({
      stack: controller.stack,
      activeDepth: controller.activeDepth,
      isTransitioning: controller.isTransitioning,
      push: controller.push,
      pop: controller.pop,
      popTo: controller.popTo,
      drillTo: controller.drillTo,
      setStack: nextStack => {
        controller.setStack(nextStack);
        controller.setActiveDepth(Math.max(0, nextStack.length - 1));
        setHiddenCardId(null);
        setHiddenCardDepth(null);
        setMorphing(null);
      },
      getPanelProps: panelKey => ({
        'data-panel-key': panelKey,
        ref: element => {
          if (!element) {
            panelRefsRef.current.delete(panelKey);
            return;
          }
          panelRefsRef.current.set(panelKey, element);
        }
      }),
      notifyPanelReady: (panelKey) => {
        const panel = panelRefsRef.current.get(panelKey);
        if (!panel) return;
        if (navDirectionRef.current !== 'forward') return;
        const config: SpringstackEnterAnimationConfig = enterAnimation ?? {};
        const selector = config.selector ?? '[data-enter-item]';
        const items = Array.from(panel.querySelectorAll(selector));
        if (items.length === 0) return;
        const durationMs = config.durationMs ?? 500;
        const staggerMs = config.staggerMs ?? 40;
        gsap.fromTo(
          items,
          { y: window.innerHeight, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: durationMs / 1000,
            stagger: staggerMs / 1000,
            ease: timingConfig.enterEase
          }
        );
      },
      getCardProps: (node, options) => ({
        'data-item-card': true,
        'data-item-type': node.kind,
        'data-item-id': node.id,
        onClick: event => options?.onSelect?.(node, event.currentTarget)
      })
    }),
    [
      controller.activeDepth,
      controller.drillTo,
      controller.isTransitioning,
      controller.pop,
      controller.popTo,
      controller.push,
      controller.stack,
      enterAnimation,
      timingConfig.enterEase
    ]
  );

  useLayoutEffect(() => {
    if (!trackRef.current) return;
    if (skipAutoTrackTweenRef.current) return;
    gsap.to(trackRef.current, {
      x: -activeDepth * panelWidthRef.current,
      duration: timingConfig.trackDurationMs / 1000,
      ease: timingConfig.trackEase
    });
  }, [activeDepth, timingConfig.trackDurationMs, timingConfig.trackEase]);

  useEffect(() => {
    if (!breadcrumbRowRef.current || !breadcrumbWrapperRef.current) return;
    const updateHeight = () => {
      if (!breadcrumbRowRef.current || !breadcrumbWrapperRef.current) return;
      const height = breadcrumbRowRef.current.getBoundingClientRect().height;
      gsap.to(breadcrumbWrapperRef.current, {
        height,
        duration: timingConfig.crumbHeightDurationMs / 1000,
        ease: timingConfig.crumbHeightEase
      });
    };
    updateHeight();
    const observer = new ResizeObserver(() => updateHeight());
    observer.observe(breadcrumbRowRef.current);
    return () => observer.disconnect();
  }, [timingConfig.crumbHeightDurationMs, timingConfig.crumbHeightEase]);

  useEffect(() => {
    if (!contentAreaRef.current) return;
    const updateWidth = () => {
      panelWidthRef.current = contentAreaRef.current?.getBoundingClientRect().width ?? 0;
    };
    updateWidth();
    const observer = new ResizeObserver(() => {
      updateWidth();
      if (trackRef.current && !skipAutoTrackTweenRef.current) {
        gsap.set(trackRef.current, { x: -activeDepth * panelWidthRef.current });
      }
    });
    observer.observe(contentAreaRef.current);
    return () => observer.disconnect();
  }, [activeDepth]);

  const runPreparedMorphToCrumb = async (prepared: ReturnType<typeof prepareGhost>, node: SpringstackNode<TData>) => {
    if (!containerRef.current) return;
    const { overlay, wrapper, shellClone, shellRect } = prepared;
    await nextFrame();
    await nextFrame();
    const target = containerRef.current.querySelector(
      `[data-crumb-target="${node.kind}:${node.id}"]`
    ) as HTMLElement | null;
    if (!target) {
      overlay.remove();
      return;
    }
    const targetShell = getShellElement(target);
    const targetContent = getContentElement(target);
    if (!targetShell || !targetContent) {
      overlay.remove();
      return;
    }
    const targetShellRect = targetShell.getBoundingClientRect();
    const targetStyles = window.getComputedStyle(targetShell);
    const padLeft = parseFloat(targetStyles.paddingLeft || '0');
    const padTop = parseFloat(targetStyles.paddingTop || '0');
    const shellDy = targetShellRect.top + padTop - shellRect.top;
    const shellDx = targetShellRect.left + padLeft - shellRect.left;
    gsap.set(targetShell, { opacity: 0 });
    gsap.set(targetContent, { opacity: 0 });
    const ghostContent = shellClone.querySelector('[data-card-content]') as HTMLElement | null;
    if (ghostContent) {
      gsap.set(ghostContent, { fontSize: '0.875rem', lineHeight: '1.25rem' });
    }
    let resolve: (() => void) | null = null;
    const completion = new Promise<void>(res => {
      resolve = res;
    });
    const duration = timingConfig.morphDurationMs / 1000;
    const timeline = gsap.timeline({
      onStart: () => setIsMorphing(true),
      onComplete: () => {
        setIsMorphing(false);
        gsap.set(targetShell, { clearProps: 'opacity' });
        gsap.set(targetContent, { clearProps: 'opacity' });
        overlay.remove();
        resolve?.();
      }
    });
    timeline.to(
      wrapper,
      {
        x: shellDx,
        y: shellDy,
        duration,
        ease: timingConfig.morphEase
      },
      0
    );
    const fadeDuration = Math.min(timingConfig.fadeDurationMs / 1000, duration * 0.4);
    const fadeStart = duration - fadeDuration;
    timeline.add(() => {
      const refreshed = targetShell.getBoundingClientRect();
      const refreshedStyles = window.getComputedStyle(targetShell);
      const refreshedPadLeft = parseFloat(refreshedStyles.paddingLeft || '0');
      const refreshedPadTop = parseFloat(refreshedStyles.paddingTop || '0');
      const freshDx = refreshed.left + refreshedPadLeft - shellRect.left;
      const freshDy = refreshed.top + refreshedPadTop - shellRect.top;
      gsap.to(wrapper, {
        x: freshDx,
        y: freshDy,
        duration: fadeDuration,
        ease: timingConfig.fadeEase
      });
    }, fadeStart);
    timeline.to(
      shellClone,
      {
        opacity: 0,
        duration: fadeDuration,
        ease: timingConfig.fadeEase
      },
      fadeStart
    );
    timeline.to(
      targetShell,
      {
        opacity: 1,
        duration: fadeDuration,
        ease: timingConfig.fadeEase
      },
      fadeStart
    );
    timeline.to(
      targetContent,
      {
        opacity: 1,
        duration: fadeDuration,
        ease: timingConfig.fadeEase
      },
      fadeStart
    );
    await completion;
  };

  const runPreparedMorphToList = async (
    prepared: ReturnType<typeof prepareGhost>,
    node: SpringstackNode<TData>,
    targetDepth: number
  ) => {
    if (!containerRef.current) return;
    const { overlay, wrapper, shellClone, shellRect } = prepared;
    await nextFrame();
    await nextFrame();
    const findTarget = () =>
      containerRef.current?.querySelector(
        `[data-item-card][data-item-type="${node.kind}"][data-item-id="${node.id}"]`
      ) as HTMLElement | null;
    let target = findTarget();
    if (!target) {
      const start = Date.now();
      while (!target && Date.now() - start < 2000) {
        await nextFrame();
        target = findTarget();
      }
    }
    if (!target) {
      overlay.remove();
      return;
    }
    const targetShell = getShellElement(target);
    const targetContent = getContentElement(target);
    if (!targetShell || !targetContent) {
      overlay.remove();
      return;
    }
    const targetCardRect = target.getBoundingClientRect();
    const duration = timingConfig.morphDurationMs / 1000;
    const shellDy = targetCardRect.top - shellRect.top;
    const shellDx = targetCardRect.left - shellRect.left;
    gsap.set(targetShell, { opacity: 0 });
    gsap.set(targetContent, { opacity: 0 });
    shellClone.classList.remove('bg-selected', 'bg-card');
    shellClone.classList.add('bg-muted');
    const ghostContent = shellClone.querySelector('[data-card-content]') as HTMLElement | null;
    if (ghostContent) {
      gsap.set(ghostContent, { fontSize: '0.875rem', lineHeight: '1.25rem' });
    }
    let resolve: (() => void) | null = null;
    const completion = new Promise<void>(res => {
      resolve = res;
    });
    const timeline = gsap.timeline({
      onStart: () => setIsMorphing(true),
      onComplete: () => {
        setIsMorphing(false);
        gsap.set(targetShell, { clearProps: 'opacity' });
        gsap.set(targetContent, { clearProps: 'opacity' });
        overlay.remove();
        resolve?.();
      }
    });
    timeline.to(
      wrapper,
      {
        x: shellDx,
        y: shellDy,
        duration,
        ease: timingConfig.morphEase
      },
      0
    );
    const fadeDuration = timingConfig.fadeDurationMs / 1000;
    const fadeStart = Math.max(0, duration - fadeDuration);
    timeline.add(() => {
      const refreshed = target.getBoundingClientRect();
      const freshDx = refreshed.left - shellRect.left;
      const freshDy = refreshed.top - shellRect.top;
      gsap.set(wrapper, { x: freshDx, y: freshDy });
      gsap.set(targetShell, { opacity: 1 });
      gsap.set(targetContent, { opacity: 1 });
    }, fadeStart);
    timeline.to(
      shellClone,
      {
        opacity: 0,
        duration: fadeDuration,
        ease: timingConfig.fadeEase
      },
      fadeStart
    );
    await completion;
  };

  const getWaitBeat = () => timingConfig.beatMs;

  const runPush = async (node: SpringstackNode<TData>, sourceEl: HTMLElement | null) => {
    navDirectionRef.current = 'forward';
    controller.setTransitioning(true);
    const shell = sourceEl ? getShellElement(sourceEl) : null;
    const prepared = shell ? prepareGhost(shell) : null;
    const sourceType = sourceEl?.getAttribute('data-item-type');
    const sourceId = sourceEl?.getAttribute('data-item-id');
    if (sourceType && sourceId) {
      setHiddenCardId(`${sourceType}:${sourceId}`);
      setHiddenCardDepth(activeDepth);
    }
    setMorphing({ kind: node.kind, id: node.id, direction: 'toCrumb' });
    const nextStack = [...controller.getStack(), node];
    controller.setStack(nextStack);
    if (prepared) {
      await runPreparedMorphToCrumb(prepared, node);
    } else {
      await wait(getWaitBeat());
    }
    const nextDepth = nextStack.length - 1;
    const panelWidth = panelWidthRef.current;
    const targetTrackX = -nextDepth * panelWidth;
    skipAutoTrackTweenRef.current = true;
    controller.setActiveDepth(nextDepth);
    if (trackRef.current) {
      await new Promise<void>(resolve => {
        gsap.to(trackRef.current, {
          x: targetTrackX,
          duration: timingConfig.trackDurationMs / 1000,
          ease: timingConfig.trackEase,
          onComplete: resolve
        });
      });
    }
    await nextFrame();
    skipAutoTrackTweenRef.current = false;
    setMorphing(null);
    controller.setTransitioning(false);
  };

  const runPop = async () => {
    navDirectionRef.current = 'back';
    const currentStack = controller.getStack();
    if (currentStack.length <= 1) return;
    controller.setTransitioning(true);
    const node = currentStack[currentStack.length - 1];
    const nextStack = currentStack.slice(0, -1);
    const nextDepth = nextStack.length - 1;
    const panelWidth = panelWidthRef.current;
    const targetTrackX = -nextDepth * panelWidth;
    const crumbEl = containerRef.current?.querySelector(
      `[data-crumb-target="${node.kind}:${node.id}"]`
    ) as HTMLElement | null;
    const shell = crumbEl ? getShellElement(crumbEl) : null;
    const prepared = shell ? prepareGhost(shell) : null;
    setMorphing({ kind: node.kind, id: node.id, direction: 'toList' });
    setHiddenCardId(`${node.kind}:${node.id}`);
    setHiddenCardDepth(nextDepth);
    controller.setStack(nextStack);
    skipAutoTrackTweenRef.current = true;
    controller.setActiveDepth(nextDepth);
    if (trackRef.current) {
      await new Promise<void>(resolve => {
        gsap.to(trackRef.current, {
          x: targetTrackX,
          duration: timingConfig.trackDurationMs / 1000,
          ease: timingConfig.trackEase,
          onComplete: resolve
        });
      });
    }
    await nextFrame();
    skipAutoTrackTweenRef.current = false;
    try {
      if (prepared) {
        await runPreparedMorphToList(prepared, node, nextDepth);
      } else {
        await wait(getWaitBeat());
      }
    } finally {
      if (hiddenCardDepth !== null && nextDepth <= hiddenCardDepth) {
        setHiddenCardId(null);
        setHiddenCardDepth(null);
      }
    }
    setMorphing(null);
    controller.setTransitioning(false);
  };

  const runPopToIndex = async (targetIndex: number) => {
    console.log('[StackNav] popTo:start', {
      targetIndex,
      stackSize: controller.getStack().length
    });
    while (controller.getStack().length - 1 > targetIndex) {
      const current = controller.getStack()[controller.getStack().length - 1];
      console.log('[StackNav] popTo:step', {
        nodeId: current?.id,
        nodeKind: current?.kind,
        stackSize: controller.getStack().length
      });
      await runPop();
      await wait(timingConfig.beatMs * timingConfig.popPauseBeats);
    }
    console.log('[StackNav] popTo:done', {
      stackSize: controller.getStack().length
    });
  };

  const runDrillToPath = async (path: SpringstackNode<TData>[]) => {
    console.log('[StackNav] drillTo:start', {
      path: path.map(node => `${node.kind}:${node.id}`),
      stackSize: controller.getStack().length
    });
    if (path.length === 0) return;
    if (controller.getStack().length > 1) {
      await runPopToIndex(0);
    }
    const currentRoot = controller.getStack()[0];
    const targetRoot = path[0];
    if (!currentRoot || currentRoot.id !== targetRoot.id || currentRoot.kind !== targetRoot.kind) {
      controller.setStack([targetRoot]);
      controller.setActiveDepth(0);
      setHiddenCardId(null);
      setHiddenCardDepth(null);
    }
    console.log('[StackNav] drillTo:root', {
      root: `${targetRoot.kind}:${targetRoot.id}`
    });
    setIsDeepLinking(true);
    await wait(timingConfig.beatMs * timingConfig.pushPauseBeats);
    for (const node of path.slice(1)) {
      console.log('[StackNav] drillTo:push', {
        nodeId: node.id,
        nodeKind: node.kind
      });
      const selector = `[data-item-card][data-item-type="${node.kind}"][data-item-id="${node.id}"]`;
      const start = Date.now();
      let el = containerRef.current?.querySelector(selector) as HTMLElement | null;
      while (!el && Date.now() - start < 2000) {
        await nextFrame();
        el = containerRef.current?.querySelector(selector) as HTMLElement | null;
      }
      await runPush(node, el ?? null);
      await wait(timingConfig.beatMs * timingConfig.pushPauseBeats);
    }
    setIsDeepLinking(false);
    console.log('[StackNav] drillTo:done', {
      stackSize: controller.getStack().length
    });
  };

  useEffect(() => {
    let cancelled = false;
    const process = async () => {
      const nextOp = controller.consumeNextOperation();
      if (!nextOp) return;
      if (cancelled) return;
      if (nextOp.type === 'push' && nextOp.node) {
        await runPush(nextOp.node, nextOp.sourceEl ?? null);
      }
      if (nextOp.type === 'pop') {
        await runPop();
      }
      if (nextOp.type === 'popTo' && typeof nextOp.index === 'number') {
        await runPopToIndex(nextOp.index);
      }
      if (nextOp.type === 'drillTo' && nextOp.path) {
        await runDrillToPath(nextOp.path);
      }
      nextOp.resolve();
    };
    process();
    return () => {
      cancelled = true;
    };
  }, [controller, queueTick, timingConfig.beatMs, timingConfig.popPauseBeats, timingConfig.pushPauseBeats]);

  const shouldHideCard = (node: SpringstackNode<TData>) => {
    const cardKey = `${node.kind}:${node.id}`;
    const isMorphingBack =
      morphing?.direction === 'toList' &&
      morphing.kind === node.kind &&
      morphing.id === node.id;
    const allowReveal = isMorphingBack && isMorphing;
    return (
      hiddenCardId === cardKey &&
      (isMorphing || isTransitioning || (hiddenCardDepth !== null && activeDepth !== hiddenCardDepth)) &&
      !allowReveal
    );
  };

  const renderCrumb = (node: SpringstackNode<TData>) => {
    const slot = getSlotRenderer(node, 'crumb', renderers);
    if (!slot) return null;
    return slot(node);
  };

  const panels = renderPanels({
    ...helpers,
    getCardProps: (node, options) => ({
      ...helpers.getCardProps(node, options),
      className: shouldHideCard(node) ? 'opacity-0 pointer-events-none' : undefined
    })
  });

  const overlay = renderOverlay ? renderOverlay(helpers) : null;

  return (
    <div
      ref={containerRef}
      className={['relative', className].filter(Boolean).join(' ')}
    >
      {renderHeader?.(helpers)}
      <div ref={breadcrumbWrapperRef} className="relative z-20 overflow-hidden">
        <div ref={breadcrumbRowRef} className="flex flex-wrap gap-2 rounded-md bg-card p-2">
          {stack.map((node, index) => (
            <div
              key={`${node.kind}-${node.id}`}
              data-card-shell="true"
              data-crumb-target={`${node.kind}:${node.id}`}
              onClick={() => helpers.popTo(index)}
              className={`flex cursor-pointer flex-col gap-1 rounded-md p-2 text-sm transition-colors ${
                index === stack.length - 1 ? 'bg-selected' : 'bg-muted'
              }`}
            >
              <div data-card-content="true" className="flex flex-col">
                <div className="flex items-start gap-1">{renderCrumb(node)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div ref={contentAreaRef} className="relative mt-2 flex flex-1 overflow-hidden rounded-md bg-card p-0">
        <div ref={trackRef} className="flex h-full w-full will-change-transform">
          {panels}
        </div>
      </div>
      {renderFooter?.(helpers)}
      {overlay ? <div className="absolute inset-0 z-50">{overlay}</div> : null}
    </div>
  );
}
