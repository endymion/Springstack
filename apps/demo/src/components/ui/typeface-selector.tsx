import { useEffect, useRef, useState } from 'react';
import { type TypefacePair } from '../../lib/typefacePairs';

interface TypefaceSelectorProps {
  options: TypefacePair[];
  value: string;
  onChange: (id: string) => void;
  motionDisabled?: boolean;
}

export function TypefaceSelector({
  options,
  value,
  onChange,
  motionDisabled = false,
}: TypefaceSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  // Scroll to selected item on mount or when value changes externally
  useEffect(() => {
    if (!containerRef.current) return;

    const selectedIndex = options.findIndex((opt) => opt.id === value);
    if (selectedIndex === -1) return;

    const container = containerRef.current;
    const itemHeight = container.scrollHeight / options.length;
    const targetScroll = selectedIndex * itemHeight;

    // Instant scroll without animation on mount
    container.scrollTo({
      top: targetScroll,
      behavior: 'instant' as ScrollBehavior,
    });
  }, [value, options]);

  // Detect which item is centered after scroll stops
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setIsScrolling(true);

      // Clear previous timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Set new timeout to detect scroll end
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);

        // Calculate which item is centered
        const itemHeight = container.scrollHeight / options.length;
        const scrollTop = container.scrollTop;
        const centerIndex = Math.round(scrollTop / itemHeight);

        const centeredOption = options[centerIndex];
        if (centeredOption && centeredOption.id !== value) {
          onChange(centeredOption.id);
        }
      }, 150);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [options, value, onChange]);

  // Handle keyboard navigation
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;

      e.preventDefault();
      const currentIndex = options.findIndex((opt) => opt.id === value);
      let newIndex = currentIndex;

      if (e.key === 'ArrowUp') {
        newIndex = Math.max(0, currentIndex - 1);
      } else if (e.key === 'ArrowDown') {
        newIndex = Math.min(options.length - 1, currentIndex + 1);
      }

      if (newIndex !== currentIndex) {
        const itemHeight = container.scrollHeight / options.length;
        container.scrollTo({
          top: newIndex * itemHeight,
          behavior: motionDisabled ? ('instant' as ScrollBehavior) : 'smooth',
        });
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [options, value, motionDisabled]);

  return (
    <div className="relative">
      {/* Centered selection indicator */}
      <div
        className="pointer-events-none absolute left-0 right-0 top-1/2 z-10 -translate-y-1/2 border-y border-primary/20 bg-primary/5"
        style={{ height: 'calc(100% / 2.5)' }}
      />

      {/* Snap scroll container */}
      <div
        ref={containerRef}
        className="typeface-scroll-container relative overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted"
        style={{
          height: 'calc(6rem * 2.5)', // 2.5x item height
          scrollSnapType: 'y mandatory',
          scrollBehavior: motionDisabled ? 'auto' : 'smooth',
        }}
        tabIndex={0}
        role="listbox"
        aria-label="Select typeface"
        aria-activedescendant={`typeface-option-${value}`}
      >
        {options.map((option, index) => {
          const isSelected = option.id === value;

          return (
            <button
              key={option.id}
              id={`typeface-option-${option.id}`}
              className="flex h-24 w-full cursor-pointer flex-col items-center justify-center gap-1 px-4 transition-opacity duration-200"
              style={{
                scrollSnapAlign: 'center',
                scrollSnapStop: 'always',
                opacity: isSelected ? 1 : 0.4,
              }}
              onClick={() => {
                const container = containerRef.current;
                if (!container) return;

                const itemHeight = container.scrollHeight / options.length;
                container.scrollTo({
                  top: index * itemHeight,
                  behavior: motionDisabled ? ('instant' as ScrollBehavior) : 'smooth',
                });
              }}
              role="option"
              aria-selected={isSelected}
            >
              {/* Font pair name */}
              <div className="text-xs font-semibold uppercase tracking-wider text-foreground">
                {option.name}
              </div>

              {/* Headline sample */}
              <div
                className="text-base font-semibold text-foreground"
                style={{
                  fontFamily: option.headline.family,
                  fontWeight: option.headline.weight,
                }}
              >
                Headline Sample
              </div>

              {/* Body sample */}
              <div
                className="text-xs text-muted-foreground"
                style={{
                  fontFamily: option.body.family,
                  fontWeight: option.body.weight,
                }}
              >
                Body text sample
              </div>
            </button>
          );
        })}
      </div>

      {/* Fade edges */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-background to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}
