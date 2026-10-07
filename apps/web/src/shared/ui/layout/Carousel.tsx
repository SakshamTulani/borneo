import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export type CarouselSlide = { key: string; label: string; node: ReactNode };

const REDUCED = '(prefers-reduced-motion: reduce)';
const subscribeMotion = (onChange: () => void) => {
  const query = globalThis.matchMedia?.(REDUCED);
  query?.addEventListener?.('change', onChange);
  return () => query?.removeEventListener?.('change', onChange);
};
/** Still on the server and wherever the browser can't say: autoplay only when it's known safe. */
const prefersStill = () => globalThis.matchMedia?.(REDUCED).matches ?? true;

/**
 * A row of full-width slides (WAI-ARIA carousel pattern). Swipe or scroll on touch, Previous /
 * Next and one dot per slide otherwise. Advances by itself every `intervalMs`, but never while
 * hovered, focused, paused with the visible Pause button (WCAG 2.2.2), the tab is hidden, or the
 * visitor asks for reduced motion. Server render shows every slide, the first in view.
 */
export function Carousel({
  label,
  slides,
  intervalMs = 7000,
  className,
}: {
  label: string;
  slides: CarouselSlide[];
  intervalMs?: number;
  className?: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [held, setHeld] = useState(false);
  const still = useSyncExternalStore(subscribeMotion, prefersStill, () => true);
  const count = slides.length;

  const go = (to: number) => {
    const el = track.current;
    const next = (to + count) % count;
    setIndex(next);
    el?.scrollTo?.({ left: next * el.clientWidth, behavior: still ? 'auto' : 'smooth' });
  };

  useEffect(() => {
    if (count < 2 || paused || held || still) return;
    const id = setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      const el = track.current;
      const at = el && el.clientWidth ? Math.round(el.scrollLeft / el.clientWidth) : index;
      const next = (at + 1) % count;
      setIndex(next);
      el?.scrollTo?.({ left: next * el.clientWidth, behavior: 'smooth' });
    }, intervalMs);
    return () => clearInterval(id);
  }, [count, paused, held, still, intervalMs, index]);

  if (count === 0) return null;
  const control =
    'inline-flex size-11 items-center justify-center rounded-full bg-surface/90 text-ink shadow-sm outline-none backdrop-blur hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand';

  return (
    <section
      aria-roledescription="carousel"
      aria-label={label}
      // Clip: nothing in the carousel may widen the page (the track scrolls inside).
      className={cn('relative overflow-x-clip', className)}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHeld(false);
      }}
    >
      <div
        ref={track}
        aria-live={paused || held || still ? 'polite' : 'off'}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.clientWidth) setIndex(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        {slides.map((s, i) => (
          <div
            key={s.key}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}: ${s.label}`}
            className="w-full shrink-0 snap-start"
          >
            {s.node}
          </div>
        ))}
      </div>
      {count > 1 ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex items-center justify-center gap-2 px-4">
          <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-surface/80 p-1 shadow-sm backdrop-blur">
            <button
              type="button"
              className={control}
              aria-label="Previous slide"
              onClick={() => go(index - 1)}
            >
              <ChevronLeftIcon className="size-5" aria-hidden />
            </button>
            {/* Phones: "2 / 7" keeps the bar narrow; dots (44px each) from the sm breakpoint. */}
            <span className="px-2 text-sm text-ink tabular-nums sm:hidden" aria-hidden>
              {index + 1} / {count}
            </span>
            {slides.map((s, i) => (
              <button
                key={s.key}
                type="button"
                aria-label={`Show slide ${i + 1}: ${s.label}`}
                aria-current={i === index ? 'true' : undefined}
                onClick={() => go(i)}
                className="group hidden size-11 items-center justify-center rounded-full outline-none focus-visible:outline-2 focus-visible:outline-brand sm:inline-flex"
              >
                <span
                  aria-hidden
                  className={cn(
                    'h-2 rounded-full transition-all',
                    i === index ? 'w-6 bg-brand' : 'w-2 bg-line-strong group-hover:bg-ink-muted',
                  )}
                />
              </button>
            ))}
            <button
              type="button"
              className={control}
              aria-label="Next slide"
              onClick={() => go(index + 1)}
            >
              <ChevronRightIcon className="size-5" aria-hidden />
            </button>
            {!still ? (
              <button
                type="button"
                className={control}
                aria-label={paused ? 'Play slides' : 'Pause slides'}
                onClick={() => setPaused(!paused)}
              >
                {paused ? (
                  <PlayIcon className="size-4" aria-hidden />
                ) : (
                  <PauseIcon className="size-4" aria-hidden />
                )}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
