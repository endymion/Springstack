import type { MouseEvent, ReactNode } from 'react';

export type SpringstackTimingMode = 'normal' | 'reduced' | 'gratuitous' | 'slow' | 'off';

export interface SpringstackTimingConfig {
  beatMs: number;
  trackDurationMs: number;
  morphDurationMs: number;
  fadeDurationMs: number;
  crumbHeightDurationMs: number;
  pushPauseBeats: number;
  popPauseBeats: number;
  trackEase: string;
  morphEase: string;
  fadeEase: string;
  crumbHeightEase: string;
  enterEase: string;
}

export type SpringstackSlotRenderer<TData> = (node: SpringstackNode<TData>) => ReactNode;

export interface SpringstackSlots<TData = unknown> {
  list?: SpringstackSlotRenderer<TData>;
  crumb?: SpringstackSlotRenderer<TData>;
  panel?: SpringstackSlotRenderer<TData>;
}

export interface SpringstackNode<TData = unknown> {
  id: string;
  kind: string;
  title?: string;
  data?: TData;
  slots?: SpringstackSlots<TData>;
}

export interface SpringstackRenderers<TData = unknown> {
  list?: Record<string, SpringstackSlotRenderer<TData>> & { default?: SpringstackSlotRenderer<TData> };
  crumb?: Record<string, SpringstackSlotRenderer<TData>> & { default?: SpringstackSlotRenderer<TData> };
  panel?: Record<string, SpringstackSlotRenderer<TData>> & { default?: SpringstackSlotRenderer<TData> };
}

export interface SpringstackHandle<TData = unknown> {
  push: (node: SpringstackNode<TData>, sourceEl?: HTMLElement | null) => Promise<void>;
  pop: () => Promise<void>;
  popTo: (index: number) => Promise<void>;
  drillTo: (path: SpringstackNode<TData>[]) => Promise<void>;
  setStack: (stack: SpringstackNode<TData>[]) => void;
  setTimingMode: (mode: SpringstackTimingMode) => void;
  setTimingConfig: (config: Partial<SpringstackTimingConfig>) => void;
  getStack: () => SpringstackNode<TData>[];
}

export interface SpringstackHelpers<TData = unknown> {
  stack: SpringstackNode<TData>[];
  activeDepth: number;
  isTransitioning: boolean;
  push: (node: SpringstackNode<TData>, sourceEl?: HTMLElement | null) => Promise<void>;
  pop: () => Promise<void>;
  popTo: (index: number) => Promise<void>;
  drillTo: (path: SpringstackNode<TData>[]) => Promise<void>;
  setStack: (stack: SpringstackNode<TData>[]) => void;
  getPanelProps: (panelKey: string) => {
    'data-panel-key': string;
    ref: (element: HTMLDivElement | null) => void;
  };
  notifyPanelReady: (panelKey: string) => void;
  getCardProps: (
    node: SpringstackNode<TData>,
    options?: { onSelect?: (node: SpringstackNode<TData>, sourceEl: HTMLElement | null) => void }
  ) => {
    'data-item-card': true;
    'data-item-type': string;
    'data-item-id': string;
    className?: string;
    onClick: (event: MouseEvent<HTMLElement>) => void;
  };
}

export interface SpringstackEnterAnimationConfig {
  selector?: string;
  durationMs?: number;
  staggerMs?: number;
}

export interface SpringstackRoutingConfig<TData = unknown> {
  enabled?: boolean;
  useHash?: boolean;
  parse?: (path: string) => SpringstackNode<TData>[];
  serialize?: (stack: SpringstackNode<TData>[]) => string;
  basePath?: string;
  waitForCardMs?: number;
  onMissingCard?: 'abort' | 'push' | 'wait';
}

export interface SpringstackProps<TData = unknown> {
  initialStack: SpringstackNode<TData>[];
  renderPanels: (helpers: SpringstackHelpers<TData>) => ReactNode;
  renderHeader?: (helpers: SpringstackHelpers<TData>) => ReactNode;
  renderFooter?: (helpers: SpringstackHelpers<TData>) => ReactNode;
  renderOverlay?: (helpers: SpringstackHelpers<TData>) => ReactNode;
  renderers?: SpringstackRenderers<TData>;
  enterAnimation?: SpringstackEnterAnimationConfig;
  timingMode?: SpringstackTimingMode;
  timingConfig?: Partial<SpringstackTimingConfig>;
  routing?: SpringstackRoutingConfig<TData>;
  overlayPortal?: boolean;
  className?: string;
  onStackChange?: (stack: SpringstackNode<TData>[]) => void;
}
