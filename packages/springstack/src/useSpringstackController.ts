import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SpringstackNode, SpringstackTimingConfig, SpringstackTimingMode } from './types';
import { resolveTimingConfig } from './timing';

interface StackOperation<TData = unknown> {
  type: 'push' | 'pop' | 'popTo' | 'drillTo';
  node?: SpringstackNode<TData>;
  sourceEl?: HTMLElement | null;
  index?: number;
  path?: SpringstackNode<TData>[];
  resolve: () => void;
}

export interface UseSpringstackControllerOptions<TData = unknown> {
  initialStack: SpringstackNode<TData>[];
  timingMode?: SpringstackTimingMode;
  timingConfig?: Partial<SpringstackTimingConfig>;
  onStackChange?: (stack: SpringstackNode<TData>[]) => void;
}

export interface SpringstackController<TData = unknown> {
  stack: SpringstackNode<TData>[];
  activeDepth: number;
  isTransitioning: boolean;
  timingMode: SpringstackTimingMode;
  timingConfig: SpringstackTimingConfig;
  queueTick: number;
  push: (node: SpringstackNode<TData>, sourceEl?: HTMLElement | null) => Promise<void>;
  pop: () => Promise<void>;
  popTo: (index: number) => Promise<void>;
  drillTo: (path: SpringstackNode<TData>[]) => Promise<void>;
  setStack: (stack: SpringstackNode<TData>[]) => void;
  setTimingMode: (mode: SpringstackTimingMode) => void;
  setTimingConfig: (config: Partial<SpringstackTimingConfig>) => void;
  getStack: () => SpringstackNode<TData>[];
  consumeNextOperation: () => StackOperation<TData> | null;
  setTransitioning: (state: boolean) => void;
  setActiveDepth: (depth: number) => void;
}

export const useSpringstackController = <TData,>(
  options: UseSpringstackControllerOptions<TData>
): SpringstackController<TData> => {
  const { initialStack, timingMode: timingModeProp, timingConfig: timingConfigProp, onStackChange } = options;
  const [stack, setStackState] = useState<SpringstackNode<TData>[]>(initialStack);
  const stackRef = useRef<SpringstackNode<TData>[]>(initialStack);
  const [activeDepth, setActiveDepthState] = useState(initialStack.length - 1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [timingMode, setTimingModeState] = useState<SpringstackTimingMode>(timingModeProp ?? 'normal');
  const [timingConfigOverrides, setTimingConfigOverrides] = useState<Partial<SpringstackTimingConfig>>(
    timingConfigProp ?? {}
  );
  const [queueTick, setQueueTick] = useState(0);
  const queueRef = useRef<StackOperation<TData>[]>([]);
  const processingRef = useRef(false);

  const timingConfig = useMemo(
    () => resolveTimingConfig(timingMode, timingConfigOverrides),
    [timingMode, timingConfigOverrides]
  );

  useEffect(() => {
    if (timingModeProp) {
      setTimingModeState(timingModeProp);
    }
  }, [timingModeProp]);

  useEffect(() => {
    if (timingConfigProp) {
      setTimingConfigOverrides(timingConfigProp);
    }
  }, [timingConfigProp]);

  useEffect(() => {
    stackRef.current = stack;
  }, [stack]);

  const setStack = useCallback(
    (nextStack: SpringstackNode<TData>[]) => {
      stackRef.current = nextStack;
      setStackState(nextStack);
      onStackChange?.(nextStack);
    },
    [onStackChange]
  );

  const enqueue = useCallback((operation: Omit<StackOperation<TData>, 'resolve'>) => {
    setQueueTick(tick => tick + 1);
    return new Promise<void>(resolve => {
      queueRef.current.push({ ...operation, resolve });
    });
  }, []);

  const consumeNextOperation = useCallback(() => {
    if (processingRef.current) return null;
    const next = queueRef.current.shift();
    if (!next) return null;
    processingRef.current = true;
    return next;
  }, []);

  const markOperationComplete = useCallback(() => {
    processingRef.current = false;
  }, []);

  const push = useCallback(
    (node: SpringstackNode<TData>, sourceEl?: HTMLElement | null) =>
      enqueue({ type: 'push', node, sourceEl }),
    [enqueue]
  );

  const pop = useCallback(() => enqueue({ type: 'pop' }), [enqueue]);

  const popTo = useCallback(
    (index: number) => enqueue({ type: 'popTo', index }),
    [enqueue]
  );

  const drillTo = useCallback(
    (path: SpringstackNode<TData>[]) => enqueue({ type: 'drillTo', path }),
    [enqueue]
  );

  const setTimingMode = useCallback((mode: SpringstackTimingMode) => {
    setTimingModeState(mode);
  }, []);

  const setTimingConfig = useCallback((config: Partial<SpringstackTimingConfig>) => {
    setTimingConfigOverrides(prev => ({ ...prev, ...config }));
  }, []);

  const getStack = useCallback(() => stackRef.current, []);

  const setActiveDepth = useCallback((depth: number) => {
    setActiveDepthState(depth);
  }, []);

  const setTransitioning = useCallback((state: boolean) => {
    setIsTransitioning(state);
  }, []);

  return {
    stack,
    activeDepth,
    isTransitioning,
    timingMode,
    timingConfig,
    queueTick,
    push,
    pop,
    popTo,
    drillTo,
    setStack,
    setTimingMode,
    setTimingConfig,
    getStack,
    consumeNextOperation: () => {
      const op = consumeNextOperation();
      if (!op) return null;
      return {
        ...op,
        resolve: () => {
          op.resolve();
          markOperationComplete();
          setQueueTick(tick => tick + 1);
        }
      };
    },
    setTransitioning,
    setActiveDepth
  };
};
