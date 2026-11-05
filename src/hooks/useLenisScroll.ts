import { useEffect, type RefObject } from 'react';

/**
 * Custom React hook for Lenis smooth scrolling inside a scrollable container.
 * Perfect for reading long notes, essays, and editorial pages.
 */
export function useLenisScroll(
  containerRef: RefObject<HTMLElement | null>,
  deps: any[] = []
) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let lenisInstance: any = null;
    let rafId: number;

    // Reset scroll to top on content change
    el.scrollTop = 0;

    import('lenis').then(({ default: Lenis }) => {
      if (!containerRef.current) return;

      lenisInstance = new Lenis({
        wrapper: el,
        content: (el.firstElementChild as HTMLElement) || el,
        duration: 1.15,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        touchMultiplier: 1.4,
      });

      const raf = (time: number) => {
        lenisInstance?.raf(time);
        rafId = requestAnimationFrame(raf);
      };
      rafId = requestAnimationFrame(raf);
    });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (lenisInstance) {
        lenisInstance.destroy();
        lenisInstance = null;
      }
    };
  }, deps);
}
