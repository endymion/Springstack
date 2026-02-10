import { useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';

const mergeClass = (...classes: Array<string | undefined>) => classes.filter(Boolean).join(' ');

export interface SelectorOption {
  id: string;
  label: React.ReactNode;
  icon?: React.ElementType;
  content?: React.ReactNode;
  preview?: React.ReactNode;
}

interface AnimatedSelectorProps {
  options: SelectorOption[];
  value: string;
  onChange: (value: string) => void;
  layout?: 'grid' | 'vertical' | 'horizontal' | 'compact';
  className?: string;
  name?: string;
  motionDisabled?: boolean;
  motionDurationMs?: number;
  motionEase?: string;
  motionEnterDurationMs?: number;
  compactIconClassName?: string;
  compactIconSize?: number;
}

export function AnimatedSelector({
  options,
  value,
  onChange,
  layout = 'horizontal',
  className,
  name = 'selector',
  motionDisabled = false,
  motionDurationMs = 1200,
  motionEase = 'elastic.out(1, 0.6)',
  motionEnterDurationMs = 200,
  compactIconClassName = '',
  compactIconSize = 16
}: AnimatedSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const setHighlight = (animate: boolean) => {
    const container = containerRef.current;
    const highlight = highlightRef.current;
    const targetButton = buttonRefs.current[value];
    if (!container || !highlight || !targetButton) return;

    const containerRect = container.getBoundingClientRect();
    const targetRect = targetButton.getBoundingClientRect();
    const left = targetRect.left - containerRect.left;
    const top = targetRect.top - containerRect.top;
    const width = targetRect.width;
    const height = targetRect.height;

    const motionPref = document.documentElement.dataset.motion;
    const shouldAnimate = animate && !motionDisabled && motionPref !== 'off';

    if (!shouldAnimate) {
      gsap.set(highlight, { x: left, y: top, width, height, opacity: 1 });
      return;
    }

    gsap.to(highlight, {
      x: left,
      y: top,
      width,
      height,
      opacity: 1,
      duration: motionDurationMs / 1000,
      ease: motionEase,
      overwrite: true
    });
  };

  useLayoutEffect(() => {
    setHighlight(false);
  }, []);

  useLayoutEffect(() => {
    setHighlight(true);
  }, [value, motionDisabled, motionDurationMs, motionEase]);

  const handleSelect = (id: string) => {
    if (id === value || !containerRef.current) return;
    onChange(id);
  };

  const getLayoutClasses = () => {
    switch (layout) {
      case 'grid':
        return 'grid grid-cols-3 gap-2 auto-rows-fr';
      case 'vertical':
        return 'flex flex-col gap-2';
      case 'horizontal':
        return 'flex flex-row gap-2';
      case 'compact':
        return 'grid grid-cols-3 gap-2 auto-rows-fr';
      default:
        return 'flex gap-2';
    }
  };

  return (
    <div className={mergeClass(getLayoutClasses(), 'relative isolate', className)} ref={containerRef}>
      <div className="absolute inset-0 pointer-events-none z-10">
        <div
          ref={highlightRef}
          className={'selector-highlight-' + name + ' absolute left-0 top-0 bg-selected rounded-xl'}
        />
      </div>
      {options.map(option => {
        const isSelected = value === option.id;
        const Icon = option.icon;

        return (
          <button
            key={option.id}
            ref={node => {
              buttonRefs.current[option.id] = node;
            }}
            onClick={() => handleSelect(option.id)}
            className={mergeClass(
              'relative flex items-stretch justify-center rounded-xl transition-all outline-none group',
              layout === 'vertical'
                ? 'w-full justify-start gap-3 p-3'
                : layout === 'grid' || layout === 'compact'
                  ? 'flex-col gap-2 h-full w-full items-stretch py-2 px-2'
                  : 'p-3 flex-col gap-2',
              isSelected ? 'text-selected-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
            style={{
              transition: motionDisabled
                ? 'none'
                : `color ${Math.max(200, motionDurationMs)}ms ease-out, background-color ${Math.max(150, motionDurationMs / 4)}ms`
            }}
          >
            <div className="absolute inset-0 bg-background rounded-xl pointer-events-none z-0" />

            <div className="relative z-20 flex items-center justify-center gap-2 w-full h-full pointer-events-none">
              {layout === 'vertical' ? (
                <>
                  {Icon && (
                    <div
                      className={mergeClass(
                        'w-6 h-6 rounded-full shrink-0 flex items-center justify-center transition-colors duration-500',
                        isSelected ? 'text-primary-text' : 'bg-muted/50'
                      )}
                    >
                      <Icon className="w-4 h-4" strokeWidth={2.25} />
                    </div>
                  )}
                  <div className="text-left flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">{option.label}</div>
                    {option.content && (
                      <div className="text-xs opacity-70 font-medium truncate">{option.content}</div>
                    )}
                  </div>
                </>
              ) : layout === 'compact' ? (
                <>
                  {Icon && (
                    <Icon
                      className={compactIconClassName}
                      strokeWidth={2.25}
                      width={compactIconSize}
                      height={compactIconSize}
                      style={{ width: compactIconSize, height: compactIconSize }}
                    />
                  )}
                  <span className="text-xs font-bold">{option.label}</span>
                </>
              ) : (
                <div className="flex flex-col items-stretch gap-2 w-full">
                  {option.preview ? (
                    <div className="w-full">{option.preview}</div>
                  ) : (
                    Icon && <Icon className="w-6 h-6 self-center" strokeWidth={2.25} />
                  )}
                  {option.label ? (
                    <span className="text-xs font-bold text-center w-full">{option.label}</span>
                  ) : null}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
