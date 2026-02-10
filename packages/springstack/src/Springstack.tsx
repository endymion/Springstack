import { cloneElement, isValidElement, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import gsap from 'gsap';
import type {
  SpringstackHelpers,
  SpringstackProps,
  SpringstackNode,
  SpringstackRenderers,
  SpringstackSlotRenderer,
  SpringstackEnterAnimationConfig,
  SpringstackRoutingConfig
} from './types';
import { useSpringstackController } from './useSpringstackController';

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
const waitForTrackReady = async (
  trackRef: React.RefObject<HTMLDivElement>,
  contentAreaRef: React.RefObject<HTMLDivElement>,
  panelWidthRef: React.MutableRefObject<number>
) => {
  const start = Date.now();
  while (Date.now() - start < 2000) {
    const width = contentAreaRef.current?.getBoundingClientRect().width ?? 0;
    if (trackRef.current && width > 0) {
      panelWidthRef.current = width;
      return;
    }
    await nextFrame();
  }
};

const waitForCard = async <TData,>(
  containerRef: React.RefObject<HTMLDivElement>,
  node: SpringstackNode<TData>,
  waitForCardMs: number,
  mode: 'abort' | 'push' | 'wait'
): Promise<{ el: HTMLElement | null; timedOut: boolean }> => {
  if (mode === 'wait') {
    waitForCardMs = Number.POSITIVE_INFINITY;
  }
  const selector = `[data-item-card][data-item-type="${node.kind}"][data-item-id="${node.id}"]`;
  const findTarget = () =>
    containerRef.current?.querySelector(selector) as HTMLElement | null;
  let el = findTarget();
  if (el) return { el, timedOut: false };
  let resolveObserver: (() => void) | null = null;
  const observerPromise = new Promise<void>(resolve => {
    resolveObserver = resolve;
  });
  const observer = new MutationObserver(() => {
    const found = findTarget();
    if (found) {
      el = found;
      resolveObserver?.();
    }
  });
  if (containerRef.current) {
    observer.observe(containerRef.current, { childList: true, subtree: true });
  }
  const start = Date.now();
  while (!el && Date.now() - start < waitForCardMs) {
    await Promise.race([nextFrame(), observerPromise]);
  }
  observer.disconnect();
  return { el, timedOut: !el };
};

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
  shellClone.style.visibility = 'visible';
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

const normalizeBasePath = (basePath?: string) => {
  if (!basePath || basePath === '/') return '';
  const trimmed = basePath.startsWith('/') ? basePath : `/${basePath}`;
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
};

const stripBasePath = (path: string, basePath?: string) => {
  if (!basePath) return path;
  if (path.startsWith(basePath)) {
    const stripped = path.slice(basePath.length);
    if (!stripped) return '/';
    return stripped.startsWith('/') ? stripped : `/${stripped}`;
  }
  return path;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 64);

const formatSegment = (node: SpringstackNode<unknown>) => {
  const title = typeof node.title === 'string' ? node.title : '';
  const slug = title ? slugify(title) : '';
  const id = node.id;
  if (slug && id) return `${slug}--${id}`;
  return id || slug;
};

const parseSegmentId = (segment: string) => {
  const decoded = decodeURIComponent(segment);
  const parts = decoded.split('--');
  return parts.length > 1 ? parts[parts.length - 1] : decoded;
};

const buildDefaultPath = (stack: SpringstackNode<unknown>[]) => {
  if (stack.length === 0) return '/';
  const withoutRoot =
    stack[0]?.kind === 'root' ? stack.slice(1) : stack;
  if (withoutRoot.length === 0) return '/';
  return withoutRoot
    .map(node => `/${node.kind}/${encodeURIComponent(formatSegment(node))}`)
    .join('') || '/';
};

const defaultParsePath = (path: string): SpringstackNode<unknown>[] => {
  const clean = path.split('?')[0].split('#')[0];
  const segments = clean.replace(/^\/+/, '').split('/').filter(Boolean);
  const nodes: SpringstackNode<unknown>[] = [];
  for (let i = 0; i + 1 < segments.length; i += 2) {
    nodes.push({
      kind: segments[i],
      id: parseSegmentId(segments[i + 1])
    });
  }
  return nodes;
};

const stackEquals = (a: SpringstackNode<unknown>[], b: SpringstackNode<unknown>[]) =>
  a.length === b.length && a.every((node, index) => node.kind === b[index]?.kind && node.id === b[index]?.id);

type RoutingInitStatus = 'in-flight' | 'done';

const getRoutingInitRegistry = () => {
  const global = globalThis as {
    __SPRINGSTACK_ROUTING_INIT_GUARD__?: Map<string, { status: RoutingInitStatus; at: number }>;
  };
  if (!global.__SPRINGSTACK_ROUTING_INIT_GUARD__) {
    global.__SPRINGSTACK_ROUTING_INIT_GUARD__ = new Map<
      string,
      { status: RoutingInitStatus; at: number }
    >();
  }
  return global.__SPRINGSTACK_ROUTING_INIT_GUARD__;
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
    routing,
    overlayPortal = true,
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
  const timingConfigRef = useRef(timingConfig);
  const [isMorphing, setIsMorphing] = useState(false);
  const [isDeepLinking, setIsDeepLinking] = useState(false);
  const isDeepLinkingRef = useRef(false);
  const [hiddenCardId, setHiddenCardId] = useState<string | null>(null);
  const [hiddenCardDepth, setHiddenCardDepth] = useState<number | null>(null);
  const [hiddenPanelKey, setHiddenPanelKey] = useState<string | null>(null);
  const [pendingCrumbKey, setPendingCrumbKey] = useState<string | null>(null);
  const pendingCrumbKeyRef = useRef<string | null>(null);
  const hiddenCardElsRef = useRef<{ shell: HTMLElement; content: HTMLElement } | null>(null);
  const [morphing, setMorphing] = useState<{
    kind: string;
    id: string;
    direction: 'toCrumb' | 'toList';
  } | null>(null);
  const navDirectionRef = useRef<'forward' | 'back' | 'none'>('none');
  const updateModeRef = useRef<'push' | 'replace'>('push');
  const isApplyingRouteRef = useRef(false);
  const lastPathRef = useRef<string | null>(null);
  const pendingDeepLinkPathRef = useRef<SpringstackNode<TData>[] | null>(null);
  const deepLinkRunIdRef = useRef(0);
  const [deepLinkTick, setDeepLinkTick] = useState(0);
  const deepLinkInProgressRef = useRef(false);
  const lastScheduledDeepLinkRef = useRef<string | null>(null);
  const deepLinkActiveRunIdRef = useRef<number | null>(null);
  const debugEnabled =
    typeof globalThis !== 'undefined' &&
    (globalThis as { __SPRINGSTACK_DEBUG__?: boolean }).__SPRINGSTACK_DEBUG__ === true;
  const debugLog = (...args: unknown[]) => {
    if (debugEnabled) {
      console.log('[StackNav][debug]', ...args);
    }
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);
  const breadcrumbRowRef = useRef<HTMLDivElement>(null);
  const breadcrumbWrapperRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const panelWidthRef = useRef(0);
  const displayDepthRef = useRef(0);
  const trackTweenRef = useRef<gsap.core.Tween | null>(null);
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
      drillTo: (path: SpringstackNode<TData>[]) => {
        pendingDeepLinkPathRef.current = path;
        deepLinkRunIdRef.current += 1;
        setDeepLinkTick(tick => tick + 1);
        return Promise.resolve();
      },
      setStack: nextStack => {
        updateModeRef.current = 'replace';
        controller.setStack(nextStack);
        const nextDepth = Math.max(0, nextStack.length - 1);
        const targetDepth =
          (controller.isTransitioning || isDeepLinkingRef.current)
            ? controller.activeDepth
            : nextDepth;
        controller.setActiveDepth(targetDepth);
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
      timingConfig.enterEase,
      isDeepLinking
    ]
  );

  const routingConfig: SpringstackRoutingConfig<TData> = routing ?? {};
  const routingEnabled =
    routingConfig.enabled ?? (typeof window !== 'undefined' && typeof history !== 'undefined');
  const basePath = normalizeBasePath(routingConfig.basePath);
  const useHash = routingConfig.useHash ?? false;
  const waitForCardMs = routingConfig.waitForCardMs ?? 15000;
  const onMissingCard = routingConfig.onMissingCard ?? 'abort';
  const parsePath = (path: string) => {
    const parsed = (routingConfig.parse ?? defaultParsePath)(stripBasePath(path, basePath)) as SpringstackNode<TData>[];
    if (parsed.length === 0) return initialStack;
    const root = initialStack[0];
    if (!root) return parsed;
    const normalized =
      parsed[0]?.kind === root.kind && parsed[0]?.id === root.id
        ? parsed.slice(1)
        : parsed[0]?.kind === 'root'
          ? parsed.slice(1)
          : parsed;
    return [root, ...normalized];
  };
  const serializeStack = (nextStack: SpringstackNode<TData>[]) => {
    const custom = routingConfig.serialize?.(nextStack);
    const raw = custom ?? buildDefaultPath(nextStack as SpringstackNode<unknown>[]);
    const prefixed = basePath ? `${basePath}${raw === '/' ? '' : raw}` : raw;
    return prefixed || '/';
  };
  const getLocationPath = () => {
    if (useHash) {
      const hash = window.location.hash.replace(/^#/, '');
      return hash || '/';
    }
    return window.location.pathname || '/';
  };
  const updateUrl = (path: string, mode: 'push' | 'replace') => {
    debugLog('updateUrl', { path, mode });
    if (useHash) {
      if (mode === 'replace') {
        history.replaceState(null, '', `#${path}`);
      } else {
        window.location.hash = path;
      }
      return;
    }
    if (mode === 'replace') {
      history.replaceState(null, '', path);
    } else {
      history.pushState(null, '', path);
    }
  };
  const resetStack = (nextStack: SpringstackNode<TData>[]) => {
    controller.setStack(nextStack);
    controller.setActiveDepth(Math.max(0, nextStack.length - 1));
    setHiddenCardId(null);
    setHiddenCardDepth(null);
    setMorphing(null);
  };

  const scheduleDeepLink = useCallback(
    (path: SpringstackNode<TData>[], reason: string) => {
      if (!path || path.length === 0) return;
      const pathCopy = path.map(node => node);
      const key = pathCopy.map(node => `${node.kind}:${node.id}`).join('/');
      if (deepLinkInProgressRef.current && lastScheduledDeepLinkRef.current === key) {
        debugLog('deepLink:schedule:skip', { reason: 'in-progress', key, source: reason });
        return;
      }
      const pendingKey = pendingDeepLinkPathRef.current
        ? pendingDeepLinkPathRef.current.map(node => `${node.kind}:${node.id}`).join('/')
        : null;
      if (pendingKey === key) {
        debugLog('deepLink:schedule:skip', { reason: 'pending-same', key, source: reason });
        return;
      }
      pendingDeepLinkPathRef.current = pathCopy;
      lastScheduledDeepLinkRef.current = key;
      deepLinkActiveRunIdRef.current = null;
      deepLinkRunIdRef.current += 1;
      setDeepLinkTick(tick => tick + 1);
      debugLog('deepLink:schedule', { key, runId: deepLinkRunIdRef.current, source: reason });
    },
    [debugLog]
  );

  useEffect(() => {
    if (!routingEnabled || typeof window === 'undefined') return;
    let cancelled = false;
    const currentPath = getLocationPath();
    lastPathRef.current = currentPath;
    const parsed = parsePath(currentPath);
    debugLog('routing:init', {
      currentPath,
      parsed: parsed.map(node => `${node.kind}:${node.id}`),
      initialStack: initialStack.map(node => `${node.kind}:${node.id}`)
    });
    const root = initialStack[0];
    const guardKey = [
      useHash ? 'hash' : 'path',
      basePath || '/',
      root ? `${root.kind}:${root.id}` : 'no-root',
      currentPath
    ].join('|');
    const guard = getRoutingInitRegistry();
    const existing = guard.get(guardKey);
    if (existing) {
      const currentStack = controller.getStack();
      if (stackEquals(parsed as SpringstackNode<unknown>[], currentStack as SpringstackNode<unknown>[])) {
        debugLog('routing:init:skipped', { guardKey, status: existing.status });
        return;
      }
    }
    guard.set(guardKey, { status: 'in-flight', at: Date.now() });
    if (parsed.length === 0 || stackEquals(parsed as SpringstackNode<unknown>[], initialStack as SpringstackNode<unknown>[])) {
      guard.set(guardKey, { status: 'done', at: Date.now() });
      return;
    }
    isApplyingRouteRef.current = true;
    updateModeRef.current = 'replace';
    debugLog('routing:init:drillTo', { path: parsed.map(node => `${node.kind}:${node.id}`) });
    scheduleDeepLink(parsed, 'routing:init');
    guard.set(guardKey, { status: 'done', at: Date.now() });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!routingEnabled || typeof window === 'undefined') return;
    const handler = () => {
      const path = getLocationPath();
      const parsed = parsePath(path);
      debugLog('routing:popstate', {
        path,
        parsed: parsed.map(node => `${node.kind}:${node.id}`)
      });
      isApplyingRouteRef.current = true;
      isDeepLinkingRef.current = true;
      setIsDeepLinking(true);
      updateModeRef.current = 'replace';
      const apply = async () => {
        if (parsed.length === 0) {
          resetStack(initialStack);
          setTrackX(0);
          isApplyingRouteRef.current = false;
          if (isDeepLinkingRef.current) {
            isDeepLinkingRef.current = false;
            setIsDeepLinking(false);
          }
        } else {
          scheduleDeepLink(parsed, 'routing:popstate');
        }
        lastPathRef.current = path;
        debugLog('routing:popstate:done', { path });
      };
      void apply();
    };
    const eventName = useHash ? 'hashchange' : 'popstate';
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }, [routingEnabled, useHash, basePath]);

  useEffect(() => {
    if (!routingEnabled || typeof window === 'undefined') return;
    if (isApplyingRouteRef.current) return;
    const path = serializeStack(stack);
    if (path === lastPathRef.current) return;
    debugLog('routing:stackChange', {
      path,
      stack: stack.map(node => `${node.kind}:${node.id}`),
      mode: updateModeRef.current
    });
    updateUrl(path, updateModeRef.current);
    lastPathRef.current = path;
    updateModeRef.current = 'push';
  }, [stack, routingEnabled]);

  // Removed fallback scheduler to prevent duplicate deep-link runs.

  useLayoutEffect(() => {
    if (!trackRef.current) return;
    if (isDeepLinkingRef.current) return;
    if (controller.isTransitioning) return;
    if (skipAutoTrackTweenRef.current) return;
    if (trackTweenRef.current) return;
    gsap.to(trackRef.current, {
      x: -activeDepth * panelWidthRef.current,
      duration: timingConfig.trackDurationMs / 1000,
      ease: timingConfig.trackEase
    });
    displayDepthRef.current = activeDepth;
  }, [activeDepth, timingConfig.trackDurationMs, timingConfig.trackEase]);

  useEffect(() => {
    timingConfigRef.current = timingConfig;
  }, [timingConfig]);

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
      if (!trackRef.current) return;
      if (skipAutoTrackTweenRef.current) return;
      if (trackTweenRef.current) return;
      if (isDeepLinkingRef.current || controller.isTransitioning) return;
      gsap.set(trackRef.current, { x: -activeDepth * panelWidthRef.current });
      displayDepthRef.current = activeDepth;
    });
    observer.observe(contentAreaRef.current);
    return () => observer.disconnect();
  }, [activeDepth]);

  const runPreparedMorphToCrumb = async (prepared: ReturnType<typeof prepareGhost>, node: SpringstackNode<TData>) => {
    if (!containerRef.current) return;
    const config = timingConfigRef.current;
    const { overlay, wrapper, shellClone, shellRect } = prepared;
    const selector = `[data-crumb-target="${node.kind}:${node.id}"]`;
    const findTarget = () => containerRef.current?.querySelector(selector) as HTMLElement | null;
    let target = findTarget();
    if (!target) {
      const start = Date.now();
      const observer = new MutationObserver(() => {
        const found = findTarget();
        if (found) {
          target = found;
          observer.disconnect();
        }
      });
      observer.observe(containerRef.current, { childList: true, subtree: true });
      while (!target && Date.now() - start < 2000) {
        await nextFrame();
        target = findTarget();
      }
      observer.disconnect();
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
    gsap.set(targetShell, { opacity: 0 });
    gsap.set(targetContent, { opacity: 0 });
    const targetShellRect = targetShell.getBoundingClientRect();
    const targetStyles = window.getComputedStyle(targetShell);
    const padLeft = parseFloat(targetStyles.paddingLeft || '0');
    const padTop = parseFloat(targetStyles.paddingTop || '0');
    const shellDy = targetShellRect.top + padTop - shellRect.top;
    const shellDx = targetShellRect.left + padLeft - shellRect.left;
    const ghostContent = shellClone.querySelector('[data-card-content]') as HTMLElement | null;
    if (ghostContent) {
      gsap.set(ghostContent, { fontSize: '0.875rem', lineHeight: '1.25rem' });
    }
    let resolve: (() => void) | null = null;
    const completion = new Promise<void>(res => {
      resolve = res;
    });
    const duration = config.morphDurationMs / 1000;
    const timeline = gsap.timeline({
      onStart: () => setIsMorphing(true),
      onComplete: () => {
        setIsMorphing(false);
        gsap.set(targetShell, { clearProps: 'opacity' });
        gsap.set(targetContent, { clearProps: 'opacity' });
        overlay.remove();
        const crumbKey = `${node.kind}:${node.id}`;
        if (pendingCrumbKeyRef.current === crumbKey) {
          pendingCrumbKeyRef.current = null;
        }
        setPendingCrumbKey(prev => (prev === crumbKey ? null : prev));
        resolve?.();
      }
    });
    timeline.to(
      wrapper,
      {
        x: shellDx,
        y: shellDy,
        duration,
        ease: config.morphEase
      },
      0
    );
    const fadeDuration = Math.min(config.fadeDurationMs / 1000, duration * 0.4);
    const fadeInStart = duration - fadeDuration;
    const fadeOutStart = Math.max(0, fadeInStart + 0.01);
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
        ease: config.fadeEase
      });
    }, fadeInStart);
    timeline.add(() => {
      gsap.set(targetShell, { opacity: 1 });
      gsap.set(targetContent, { opacity: 1 });
      const crumbKey = `${node.kind}:${node.id}`;
      if (pendingCrumbKeyRef.current === crumbKey) {
        pendingCrumbKeyRef.current = null;
      }
      setPendingCrumbKey(prev => (prev === crumbKey ? null : prev));
    }, fadeInStart);
    timeline.to(
      shellClone,
      {
        opacity: 0,
        duration: fadeDuration,
        ease: config.fadeEase
      },
      fadeOutStart
    );
    if (ghostContent) {
      timeline.to(
        ghostContent,
        {
          opacity: 0,
          duration: fadeDuration,
          ease: config.fadeEase
        },
        fadeOutStart
      );
    }
    await completion;
  };

  const runPreparedMorphToList = async (
    prepared: ReturnType<typeof prepareGhost>,
    node: SpringstackNode<TData>,
    targetDepth: number
  ) => {
    if (!containerRef.current) return;
    const config = timingConfigRef.current;
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
    const duration = config.morphDurationMs / 1000;
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
        ease: config.morphEase
      },
      0
    );
    const fadeDuration = config.fadeDurationMs / 1000;
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
        ease: config.fadeEase
      },
      fadeStart
    );
    await completion;
  };

  const getWaitBeat = () => timingConfigRef.current.beatMs;
  const setTrackX = (depth: number) => {
    displayDepthRef.current = depth;
    if (!trackRef.current || panelWidthRef.current <= 0) return;
    gsap.set(trackRef.current, { x: -depth * panelWidthRef.current });
  };
  const readPanelWidth = () =>
    contentAreaRef.current?.getBoundingClientRect().width ?? 0;
  const animateTrack = async (fromDepth: number, toDepth: number) => {
    await waitForTrackReady(trackRef, contentAreaRef, panelWidthRef);
    const width = readPanelWidth();
    panelWidthRef.current = width;
    if (!trackRef.current || width <= 0) return;
    trackTweenRef.current?.kill();
    gsap.set(trackRef.current, { x: -fromDepth * width });
    return new Promise<void>(resolve => {
      trackTweenRef.current = gsap.to(trackRef.current, {
        x: -toDepth * width,
        duration: timingConfig.trackDurationMs / 1000,
        ease: timingConfig.trackEase,
        overwrite: true,
        onComplete: () => {
          displayDepthRef.current = toDepth;
          trackTweenRef.current = null;
          resolve();
        }
      });
    });
  };

  const runPush = async (
    node: SpringstackNode<TData>,
    sourceEl: HTMLElement | null,
    fromDepthOverride?: number
  ) => {
    navDirectionRef.current = 'forward';
    controller.setTransitioning(true);
    const prevDepth = displayDepthRef.current;
    const sourceType = sourceEl?.getAttribute('data-item-type');
    const sourceId = sourceEl?.getAttribute('data-item-id');
    const nextCrumbKey = `${node.kind}:${node.id}`;
    pendingCrumbKeyRef.current = nextCrumbKey;
    let prepared: ReturnType<typeof prepareGhost> | null = null;
    if (sourceEl) {
      const sourceShell = getShellElement(sourceEl);
      const sourceContent = getContentElement(sourceEl);
      if (sourceShell && sourceContent) {
        hiddenCardElsRef.current = { shell: sourceShell, content: sourceContent };
        prepared = prepareGhost(sourceShell);
        gsap.set(sourceShell, { visibility: 'hidden', pointerEvents: 'none' });
        gsap.set(sourceContent, { visibility: 'hidden' });
      }
    }
    setMorphing({ kind: node.kind, id: node.id, direction: 'toCrumb' });
    const nextStack = [...controller.getStack(), node];
    flushSync(() => {
      if (sourceType && sourceId) {
        setHiddenCardId(`${sourceType}:${sourceId}`);
        setHiddenCardDepth(activeDepth);
      }
      setPendingCrumbKey(nextCrumbKey);
      controller.setStack(nextStack);
    });
    if (prepared) {
      await runPreparedMorphToCrumb(prepared, node);
    } else {
      await wait(getWaitBeat());
      pendingCrumbKeyRef.current = null;
      setPendingCrumbKey(prev => (prev === nextCrumbKey ? null : prev));
    }
    await waitForTrackReady(trackRef, contentAreaRef, panelWidthRef);
    const nextDepth = nextStack.length - 1;
    const panelWidth = panelWidthRef.current;
    let fromDepth = prevDepth;
    let trackX = 0;
    if (trackRef.current && panelWidth > 0) {
      trackX = Number(gsap.getProperty(trackRef.current, 'x')) || 0;
      fromDepth = Math.round(-trackX / panelWidth);
    }
    if (isDeepLinkingRef.current) {
      fromDepth = displayDepthRef.current;
    }
    if (typeof fromDepthOverride === 'number') {
      fromDepth = fromDepthOverride;
    }
    fromDepth = Math.min(nextDepth, Math.max(0, fromDepth));
    debugLog('push:track', {
      fromDepth,
      nextDepth,
      panelWidth,
      trackX,
      activeDepth: controller.activeDepth,
      displayDepth: displayDepthRef.current,
      deepLink: isDeepLinkingRef.current
    });
    const targetTrackX = -nextDepth * panelWidth;
    const targetPanel = panelRefsRef.current.get(node.kind);
    if (targetPanel) {
      targetPanel.style.visibility = 'hidden';
    }
    setHiddenPanelKey(node.kind);
    skipAutoTrackTweenRef.current = true;
    controller.setActiveDepth(nextDepth);
    if (targetPanel) {
      targetPanel.style.visibility = '';
    }
    setHiddenPanelKey(null);
    await animateTrack(fromDepth, nextDepth);
    await nextFrame();
    skipAutoTrackTweenRef.current = false;
    setMorphing(null);
    if (hiddenCardElsRef.current) {
      gsap.set(hiddenCardElsRef.current.shell, { clearProps: 'opacity,pointerEvents,visibility' });
      gsap.set(hiddenCardElsRef.current.content, { clearProps: 'opacity,visibility' });
      hiddenCardElsRef.current = null;
    }
    controller.setTransitioning(false);
  };

  const runPop = async () => {
    navDirectionRef.current = 'back';
    const currentStack = controller.getStack();
    if (currentStack.length <= 1) return;
    controller.setTransitioning(true);
    let fromDepth = displayDepthRef.current;
    const node = currentStack[currentStack.length - 1];
    const nextStack = currentStack.slice(0, -1);
    const nextDepth = nextStack.length - 1;
    const panelWidth = panelWidthRef.current;
    if (trackRef.current && panelWidth > 0) {
      const trackX = Number(gsap.getProperty(trackRef.current, 'x')) || 0;
      fromDepth = Math.max(0, Math.round(-trackX / panelWidth));
    }
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
    await animateTrack(fromDepth, nextDepth);
    await nextFrame();
    skipAutoTrackTweenRef.current = false;
    try {
      if (prepared) {
        await runPreparedMorphToList(prepared, node, nextDepth);
      } else {
        await wait(getWaitBeat());
      }
    } finally {
      setHiddenCardId(null);
      setHiddenCardDepth(null);
    }
    setMorphing(null);
    controller.setTransitioning(false);
  };

  const runPopToIndex = async (targetIndex: number) => {
    const config = timingConfigRef.current;
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
      await wait(config.beatMs * config.popPauseBeats);
    }
    console.log('[StackNav] popTo:done', {
      stackSize: controller.getStack().length
    });
  };

  const runDrillToPath = async (path: SpringstackNode<TData>[]) => {
    const config = timingConfigRef.current;
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
      setTrackX(0);
      setHiddenCardId(null);
      setHiddenCardDepth(null);
    }
    console.log('[StackNav] drillTo:root', {
      root: `${targetRoot.kind}:${targetRoot.id}`
    });
    isDeepLinkingRef.current = true;
    setIsDeepLinking(true);
    navDirectionRef.current = 'forward';
    setTrackX(0);
    await wait(config.beatMs * config.pushPauseBeats);
    await waitForTrackReady(trackRef, contentAreaRef, panelWidthRef);
    setTrackX(0);
    let drillDepth = 0;
    for (const node of path.slice(1)) {
      console.log('[StackNav] drillTo:push', {
        nodeId: node.id,
        nodeKind: node.kind
      });
      const result = await waitForCard(containerRef, node, waitForCardMs, onMissingCard);
      if (!result.el && result.timedOut && onMissingCard === 'abort') {
        console.log('[StackNav] drillTo:abort', {
          nodeId: node.id,
          nodeKind: node.kind,
          reason: 'missing-card'
        });
        isDeepLinkingRef.current = false;
        setIsDeepLinking(false);
        return;
      }
      await runPush(node, result.el ?? null, drillDepth);
      drillDepth += 1;
      await wait(config.beatMs * config.pushPauseBeats);
    }
    isDeepLinkingRef.current = false;
    setIsDeepLinking(false);
    console.log('[StackNav] drillTo:done', {
      stackSize: controller.getStack().length
    });
  };

  useEffect(() => {
    const path = pendingDeepLinkPathRef.current;
    if (!path || path.length === 0) return;
    const pathSnapshot = path.map(node => node);
    pendingDeepLinkPathRef.current = null;
    const runId = deepLinkRunIdRef.current;
    let cancelled = false;
    if (deepLinkActiveRunIdRef.current === runId) {
      return;
    }
    deepLinkActiveRunIdRef.current = runId;

    const run = async () => {
      console.log('[StackNav] deepLink:run:start', {
        path: pathSnapshot.map(node => `${node.kind}:${node.id}`),
        runId
      });
      let succeeded = false;
      try {
        isApplyingRouteRef.current = true;
        isDeepLinkingRef.current = true;
        deepLinkInProgressRef.current = true;
        setIsDeepLinking(true);
        updateModeRef.current = 'replace';
        navDirectionRef.current = 'forward';

        const root = initialStack[0];
        if (root) {
          controller.setStack([root]);
          controller.setActiveDepth(0);
          setTrackX(0);
          setHiddenCardId(null);
          setHiddenCardDepth(null);
          setMorphing(null);
        }

        const config = timingConfigRef.current;
        await wait(config.beatMs * config.pushPauseBeats);
        setTrackX(0);

        console.log('[StackNav] deepLink:run:beforeLoop', {
          pathLength: pathSnapshot.length,
          runId,
          currentRunId: deepLinkRunIdRef.current
        });

        for (const node of pathSnapshot.slice(1)) {
          if (cancelled || runId !== deepLinkRunIdRef.current) return;
          console.log('[StackNav] deepLink:waitForCard', {
            node: `${node.kind}:${node.id}`,
            selector: `[data-item-card][data-item-type="${node.kind}"][data-item-id="${node.id}"]`
          });
          const result = await waitForCard(containerRef, node, waitForCardMs, onMissingCard);
          console.log('[StackNav] deepLink:waitForCard:result', {
            node: `${node.kind}:${node.id}`,
            found: Boolean(result.el),
            timedOut: result.timedOut
          });
          if (!result.el && result.timedOut && onMissingCard === 'abort') {
            debugLog('deepLink:abort', {
              node: `${node.kind}:${node.id}`,
              runId
            });
            break;
          }
          console.log('[StackNav] deepLink:runPush', {
            node: `${node.kind}:${node.id}`,
            hasSource: Boolean(result.el)
          });
          await controller.push(node, result.el ?? null);
          await wait(config.beatMs * config.pushPauseBeats);
        }

        if (cancelled || runId !== deepLinkRunIdRef.current) return;
        isDeepLinkingRef.current = false;
        deepLinkInProgressRef.current = false;
        setIsDeepLinking(false);
        isApplyingRouteRef.current = false;
        lastPathRef.current = getLocationPath();
        debugLog('deepLink:run:done', { runId });
        succeeded = true;
      } catch (error) {
        console.error('[StackNav] deepLink:run:error', error);
      } finally {
        if (deepLinkInProgressRef.current && runId === deepLinkRunIdRef.current) {
          deepLinkInProgressRef.current = false;
        }
        if (isDeepLinkingRef.current && runId === deepLinkRunIdRef.current) {
          isDeepLinkingRef.current = false;
          setIsDeepLinking(false);
        }
        if (isApplyingRouteRef.current && runId === deepLinkRunIdRef.current) {
          isApplyingRouteRef.current = false;
        }
        if (!succeeded && runId === deepLinkRunIdRef.current) {
          debugLog('deepLink:run:failed', { runId });
        }
      }
    };

    void run();
    return () => {
      if (runId !== deepLinkRunIdRef.current) {
        cancelled = true;
      }
      if (deepLinkActiveRunIdRef.current === runId) {
        deepLinkActiveRunIdRef.current = null;
      }
    };
  }, [deepLinkTick, initialStack, waitForCardMs, onMissingCard]);

  useEffect(() => {
    let cancelled = false;
    const process = async () => {
      const nextOp = controller.consumeNextOperation();
      if (!nextOp) return;
      if (cancelled) return;
      debugLog('queue:start', {
        opId: nextOp.id,
        type: nextOp.type,
        path: nextOp.path?.map(node => `${node.kind}:${node.id}`),
        stackSize: controller.getStack().length
      });
      if (nextOp.type !== 'drillTo') {
        isApplyingRouteRef.current = false;
        updateModeRef.current = 'push';
      }
      if (nextOp.type === 'drillTo' && nextOp.path) {
        pendingDeepLinkPathRef.current = nextOp.path;
        deepLinkRunIdRef.current += 1;
        setDeepLinkTick(tick => tick + 1);
      } else if (nextOp.type === 'push' && nextOp.node) {
        await runPush(nextOp.node, nextOp.sourceEl ?? null);
      } else if (nextOp.type === 'pop') {
        await runPop();
      } else if (nextOp.type === 'popTo' && typeof nextOp.index === 'number') {
        await runPopToIndex(nextOp.index);
      }
      debugLog('queue:done', {
        opId: nextOp.id,
        type: nextOp.type,
        stackSize: controller.getStack().length
      });
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
    return hiddenCardId === cardKey && !allowReveal;
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
      'data-testid': `springstack-card-${node.kind}-${node.id}`,
      className: shouldHideCard(node) ? 'invisible pointer-events-none' : undefined
    }),
    getPanelProps: panelKey => {
      const base = helpers.getPanelProps(panelKey);
      if (hiddenPanelKey === panelKey) {
        const baseStyle = (base as { style?: React.CSSProperties }).style ?? {};
        return {
          ...base,
          'data-panel-hidden': 'true',
          style: { ...baseStyle, visibility: 'hidden' }
        };
      }
      return base;
    }
  });

  const panelsWithTestIds = panels.map((panel, index) => {
    if (!isValidElement(panel)) return panel;
    const existing = panel.props as { ['data-testid']?: string };
    if (existing['data-testid']) return panel;
    return cloneElement(panel, { 'data-testid': `springstack-panel-${index}` });
  });

  const overlay = renderOverlay ? renderOverlay(helpers) : null;
  const overlayNode =
    overlay && overlayPortal !== false && typeof document !== 'undefined'
      ? createPortal(
          <div className="fixed inset-0 z-[1000] pointer-events-auto">{overlay}</div>,
          document.body
        )
      : overlay
        ? <div className="absolute inset-0 z-50">{overlay}</div>
        : null;

  return (
    <div
      ref={containerRef}
      className={['relative', className].filter(Boolean).join(' ')}
    >
      {renderHeader?.(helpers)}
      <div ref={breadcrumbWrapperRef} className="relative z-20 overflow-hidden">
        <div ref={breadcrumbRowRef} className="flex flex-wrap gap-2 rounded-md bg-card p-2">
          {stack.map((node, index) => {
            const crumbKey = `${node.kind}:${node.id}`;
            const pendingKey = pendingCrumbKeyRef.current ?? pendingCrumbKey;
            const isPendingCrumb = pendingKey === crumbKey;
            return (
            <div
              key={`${node.kind}-${node.id}`}
              data-card-shell="true"
              data-testid={`springstack-crumb-${node.kind}-${node.id}`}
              data-crumb-target={`${node.kind}:${node.id}`}
              onClick={() => helpers.popTo(index)}
              className={`flex cursor-pointer flex-col gap-1 rounded-md p-2 text-sm transition-colors ${
                index === stack.length - 1 ? 'bg-selected' : 'bg-muted'
              } ${isPendingCrumb ? 'invisible pointer-events-none' : ''}`}
              style={isPendingCrumb ? { visibility: 'hidden', pointerEvents: 'none' } : undefined}
            >
              <div data-card-content="true" className="flex flex-col">
                <div className="flex items-start gap-1">{renderCrumb(node)}</div>
              </div>
            </div>
            );
          })}
        </div>
      </div>

      <div ref={contentAreaRef} className="relative mt-2 flex flex-1 overflow-hidden rounded-md bg-card p-0">
        <div ref={trackRef} data-testid="springstack-track" className="flex h-full w-full will-change-transform">
          {panelsWithTestIds}
        </div>
      </div>
      {renderFooter?.(helpers)}
      {overlayNode}
    </div>
  );
}
