// In-memory cache for per-note scroll positions during the session
export const noteScrollPositions = new Map<string, number>();

/**
 * Custom React hook for Lenis smooth scrolling inside a scrollable container.
 * Persists and restores scroll positions when navigating back to previously viewed notes.
 */
export function useLenisScroll(
  containerRef: RefObject<HTMLElement | null>,
  deps: any[] = [],
  noteKey?: string
) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let lenisInstance: any = null;
    let rafId: number;

    // Check if this note has a previously saved scroll position (e.g. Back navigation)
    const savedScrollTop = noteKey && noteScrollPositions.has(noteKey)
      ? (noteScrollPositions.get(noteKey) || 0)
      : 0;

    // Set immediate DOM scroll position
    el.scrollTop = savedScrollTop;

    // Continuously record scroll position on user scroll
    const handleScroll = () => {
      if (noteKey && el) {
        noteScrollPositions.set(noteKey, el.scrollTop);
      }
    };
    el.addEventListener('scroll', handleScroll, { passive: true });

    // On mobile / touch screens, native momentum scrolling is superior and prevents touch lockups
    const isMobileDevice = typeof window !== 'undefined' && (window.innerWidth < 768 || 'ontouchstart' in window);
    if (isMobileDevice) {
      return () => {
        if (noteKey && el) {
          noteScrollPositions.set(noteKey, el.scrollTop);
        }
        el.removeEventListener('scroll', handleScroll);
      };
    }

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

      if (savedScrollTop > 0) {
        lenisInstance.scrollTo(savedScrollTop, { immediate: true });
      }

      const raf = (time: number) => {
        lenisInstance?.raf(time);
        rafId = requestAnimationFrame(raf);
      };
      rafId = requestAnimationFrame(raf);
    });

    return () => {
      // Save position before unmounting / switching notes
      if (noteKey && el) {
        noteScrollPositions.set(noteKey, el.scrollTop);
      }
      el.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
      if (lenisInstance) {
        lenisInstance.destroy();
        lenisInstance = null;
      }
    };
  }, deps);
}
