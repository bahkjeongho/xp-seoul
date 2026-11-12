import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { NoteItem } from '../types';
import { Compass } from 'lucide-react';

interface ScrollLensStreamProps {
  notes: NoteItem[];
  selectedNote: NoteItem | null;
  onSelectNote: (note: NoteItem) => void;
  isCompact?: boolean;
}

export const ScrollLensStream: React.FC<ScrollLensStreamProps> = ({
  notes,
  selectedNote,
  onSelectNote,
  isCompact = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardStep = isCompact ? 72 : 112;

  // Continuous scroll position (in pixels)
  // scrollPos = activeIndex * cardStep when centered
  const [scrollPos, setScrollPos] = useState<number>(0);
  const scrollPosRef = useRef<number>(0);
  scrollPosRef.current = scrollPos;

  // Target scroll position for buttery smooth wheel lerp and snapping
  const targetPosRef = useRef<number>(0);

  // Track active center note index
  const activeIndex = Math.max(
    0,
    Math.min(notes.length - 1, Math.round(scrollPos / cardStep))
  );

  // Sync scroll position if selectedNote changes externally
  useEffect(() => {
    if (selectedNote) {
      const idx = notes.findIndex((n) => n.id === selectedNote.id);
      if (idx !== -1) {
        const targetPos = idx * cardStep;
        targetPosRef.current = targetPos;
        scrollPosRef.current = targetPos;
        setScrollPos(targetPos);
      }
    }
  }, [selectedNote, notes, cardStep]);

  // Keep scroll position in bounds if notes length shrinks
  useEffect(() => {
    const maxPos = Math.max(0, (notes.length - 1) * cardStep);
    if (scrollPosRef.current > maxPos) {
      targetPosRef.current = maxPos;
      scrollPosRef.current = maxPos;
      setScrollPos(maxPos);
    }
  }, [notes.length, cardStep]);

  // Inertia and animation frame references
  const animFrameRef = useRef<number | null>(null);
  const velocityRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const totalDragDistRef = useRef<number>(0);

  // Smooth Snap Animation to Nearest Card
  const snapToNearest = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    const maxPos = Math.max(0, (notes.length - 1) * cardStep);
    const targetIdx = Math.max(0, Math.min(notes.length - 1, Math.round(scrollPosRef.current / cardStep)));
    const targetPos = targetIdx * cardStep;
    targetPosRef.current = targetPos;

    const animateSnap = () => {
      const diff = targetPos - scrollPosRef.current;
      if (Math.abs(diff) < 0.4) {
        scrollPosRef.current = targetPos;
        targetPosRef.current = targetPos;
        setScrollPos(targetPos);
        animFrameRef.current = null;
        return;
      }
      // Smooth exponential ease towards snap target
      scrollPosRef.current += diff * 0.16;
      setScrollPos(scrollPosRef.current);
      animFrameRef.current = requestAnimationFrame(animateSnap);
    };

    animFrameRef.current = requestAnimationFrame(animateSnap);
  }, [notes.length, cardStep]);

  // Start momentum glide with friction, then smoothly settle to nearest card
  const startMomentum = useCallback(
    (initialVelocity: number) => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

      // Clamp initial velocity
      const maxVel = 48;
      velocityRef.current = Math.sign(initialVelocity) * Math.min(maxVel, Math.abs(initialVelocity));

      const friction = 0.94;
      const minVel = 0.6;
      const maxPos = Math.max(0, (notes.length - 1) * cardStep);

      const step = () => {
        velocityRef.current *= friction;

        // Over-scroll boundary resistance
        if (scrollPosRef.current < 0) {
          velocityRef.current *= 0.68;
          scrollPosRef.current += velocityRef.current;
          if (scrollPosRef.current < -70) scrollPosRef.current = -70;
        } else if (scrollPosRef.current > maxPos) {
          velocityRef.current *= 0.68;
          scrollPosRef.current += velocityRef.current;
          if (scrollPosRef.current > maxPos + 70) scrollPosRef.current = maxPos + 70;
        } else {
          scrollPosRef.current += velocityRef.current;
        }

        targetPosRef.current = scrollPosRef.current;
        setScrollPos(scrollPosRef.current);

        if (Math.abs(velocityRef.current) > minVel) {
          animFrameRef.current = requestAnimationFrame(step);
        } else {
          snapToNearest();
        }
      };

      animFrameRef.current = requestAnimationFrame(step);
    },
    [notes.length, cardStep, snapToNearest]
  );

  // Buttery-smooth continuous LERP loop for desktop mouse wheel & trackpad
  const startLerp = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    const tick = () => {
      const diff = targetPosRef.current - scrollPosRef.current;
      if (Math.abs(diff) < 0.3) {
        scrollPosRef.current = targetPosRef.current;
        setScrollPos(targetPosRef.current);
        animFrameRef.current = null;
        return;
      }
      // Silky smooth dampening factor for 60/120Hz displays
      scrollPosRef.current += diff * 0.14;
      setScrollPos(scrollPosRef.current);
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  // Desktop Wheel handler with continuous lerp
  const wheelTimeoutRef = useRef<any>(null);
  const handleWheelNative = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

      const maxPos = Math.max(0, (notes.length - 1) * cardStep);
      // Fluid accumulation onto targetPos
      const nextTarget = targetPosRef.current + e.deltaY * 0.72;
      targetPosRef.current = Math.max(-40, Math.min(maxPos + 40, nextTarget));
      startLerp();

      clearTimeout(wheelTimeoutRef.current);
      wheelTimeoutRef.current = setTimeout(() => {
        // Snap smoothly to nearest card on wheel settle
        const nearestIdx = Math.max(0, Math.min(notes.length - 1, Math.round(targetPosRef.current / cardStep)));
        targetPosRef.current = nearestIdx * cardStep;
        startLerp();
      }, 90);
    },
    [cardStep, notes.length, startLerp]
  );

  // Mobile Touch Gestures: Real-time 1:1 tracking and physics-based flick momentum
  const touchStartY = useRef<number>(0);
  const touchLastY = useRef<number>(0);
  const touchStartPos = useRef<number>(0);
  const touchHistory = useRef<Array<{ y: number; time: number }>>([]);

  // Bind native non-passive touch listeners to container for guaranteed 1:1 touch response
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onTouchStart = (e: TouchEvent) => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      isDraggingRef.current = true;
      totalDragDistRef.current = 0;

      const y = e.touches[0].clientY;
      touchStartY.current = y;
      touchLastY.current = y;
      touchStartPos.current = scrollPosRef.current;
      targetPosRef.current = scrollPosRef.current;

      const now = performance.now();
      touchHistory.current = [{ y, time: now }];
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current) return;
      if (e.cancelable) e.preventDefault();

      const y = e.touches[0].clientY;
      const now = performance.now();
      const dy = touchStartY.current - y;
      totalDragDistRef.current += Math.abs(y - touchLastY.current);
      touchLastY.current = y;

      touchHistory.current.push({ y, time: now });
      while (touchHistory.current.length > 4 && now - touchHistory.current[0].time > 120) {
        touchHistory.current.shift();
      }

      const maxPos = Math.max(0, (notes.length - 1) * cardStep);
      let target = touchStartPos.current + dy;

      // Rubber-band resistance on pull beyond ends
      if (target < 0) {
        target = target * 0.35;
      } else if (target > maxPos) {
        target = maxPos + (target - maxPos) * 0.35;
      }

      targetPosRef.current = target;
      scrollPosRef.current = target;
      setScrollPos(target);
    };

    const onTouchEnd = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;

      const now = performance.now();
      const recent = touchHistory.current.filter((p) => now - p.time <= 120);

      if (recent.length >= 2) {
        const first = recent[0];
        const last = recent[recent.length - 1];
        const dt = Math.max(14, last.time - first.time);
        // Velocity in px/frame (~16ms)
        const vy = ((first.y - last.y) / dt) * 16;

        if (Math.abs(vy) > 1.2) {
          startMomentum(vy * 1.35);
          return;
        }
      }

      snapToNearest();
    };

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: true });
    container.addEventListener('touchcancel', onTouchEnd, { passive: true });
    container.addEventListener('wheel', handleWheelNative, { passive: false });

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('touchcancel', onTouchEnd);
      container.removeEventListener('wheel', handleWheelNative);
    };
  }, [notes.length, cardStep, handleWheelNative, startMomentum, snapToNearest]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIdx = Math.min(notes.length - 1, activeIndex + 1);
        targetPosRef.current = nextIdx * cardStep;
        startLerp();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIdx = Math.max(0, activeIndex - 1);
        targetPosRef.current = prevIdx * cardStep;
        startLerp();
      } else if (e.key === 'Enter') {
        const current = notes[activeIndex];
        if (current) onSelectNote(current);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [notes, activeIndex, cardStep, onSelectNote, startLerp]);

  // Window radius for virtual rendering
  const windowRadius = 6;
  const startIndex = Math.max(0, activeIndex - windowRadius);
  const endIndex = Math.min(notes.length - 1, activeIndex + windowRadius);
  const visibleNotes = notes.slice(startIndex, endIndex + 1);

  if (notes.length === 0) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center p-8 text-center text-[#888888]">
        <Compass className="w-10 h-10 mb-3 stroke-[1.2] text-[#cccccc] animate-spin" style={{ animationDuration: '8s' }} />
        <p className="font-mono text-sm tracking-wider uppercase font-semibold text-black mb-1">No Notes Match Selected Filter</p>
        <p className="text-xs text-[#777777] max-w-sm">Select another filter or keyword.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full w-full relative overflow-hidden flex flex-col items-center justify-center select-none touch-none bg-[#fbfbfb] isolate z-0"
      style={{ touchAction: 'none' }}
    >
      {/* Target Focus Ring (Equalized concentric frame: 10px uniform gap on all 4 sides) */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center justify-center px-4">
        <div
          className={`border border-black/10 rounded-2xl pointer-events-none transition-all duration-300 ${
            isCompact
              ? 'w-[calc(100%-28px)] max-w-[300px] h-[102px]'
              : 'w-[calc(100vw-12px)] max-w-[370px] sm:max-w-[520px] md:max-w-[640px] lg:max-w-[720px] h-[130px] sm:h-[140px] lg:h-[152px]'
          }`}
        />
      </div>

      {/* Top Stream Status Indicator */}
      <div className="absolute top-6 inset-x-6 flex justify-between items-center text-[10px] font-mono uppercase tracking-wider text-[#999999] pointer-events-none z-10">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-black/50" />
          <span>{activeIndex + 1} / {notes.length}</span>
        </span>
        {!isCompact && (
          <span className="hidden sm:inline">Scroll freely or swipe · Click to open note</span>
        )}
      </div>

      {/* The Central Lens Stream Stack */}
      <div className="relative w-full flex flex-col items-center justify-center h-[760px] pointer-events-none">
        {visibleNotes.map((note, indexInWindow) => {
          const actualIndex = startIndex + indexInWindow;
          // Fractional distance from the center lens based on exact continuous pixel scrollPos
          const fractionalDist = (actualIndex * cardStep - scrollPos) / cardStep;
          const absDist = Math.abs(fractionalDist);
          const isCenter = absDist < 0.45;

          // Smooth continuous scale, opacity, and translateY
          const scale = isCompact
            ? Math.max(0.72, 1 - absDist * 0.08)
            : Math.max(0.66, 1 - absDist * 0.09);

          const opacity = Math.max(0.12, 1 - absDist * 0.25);
          const yOffset = fractionalDist * cardStep;

          return (
            <div
              key={note.id}
              onClick={(e) => {
                // If user dragged to scroll (> 6px), do NOT trigger click navigation!
                if (totalDragDistRef.current > 6) {
                  e.preventDefault();
                  e.stopPropagation();
                  return;
                }
                const targetPos = actualIndex * cardStep;
                targetPosRef.current = targetPos;
                scrollPosRef.current = targetPos;
                setScrollPos(targetPos);
                onSelectNote(note);
              }}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: `translate3d(-50%, calc(-50% + ${yOffset}px), 0px) scale(${scale})`,
                opacity,
                zIndex: Math.max(1, Math.round((10 - absDist) * 2)),
                willChange: 'transform, opacity',
              }}
              className={`flex items-center justify-between rounded-xl select-none cursor-pointer pointer-events-auto transition-colors duration-150 overflow-hidden ${
                isCenter
                  ? 'bg-white shadow-[0_14px_36px_rgba(0,0,0,0.08)] border border-black/10 ring-1 ring-black/5'
                  : 'bg-white/80 border border-black/5 hover:bg-white hover:opacity-90'
              } ${
                isCompact
                  ? 'w-[calc(100%-48px)] max-w-[280px] h-[82px] px-3.5 py-2.5'
                  : 'w-[calc(100vw-32px)] max-w-[350px] sm:max-w-[500px] md:max-w-[620px] lg:max-w-[700px] h-[110px] sm:h-[120px] lg:h-[132px] px-4 sm:px-6 py-3 sm:py-4'
              }`}
            >
              {/* Left Side: Title & Topic */}
              <div className="flex flex-col justify-center gap-1.5 flex-1 min-w-0 pr-3">
                <div className="flex items-center gap-2 min-w-0">
                  <h3
                    className={`font-semibold tracking-[-0.03em] truncate text-black font-sans ${
                      isCompact
                        ? 'text-[13px] leading-snug'
                        : isCenter
                        ? 'text-xl lg:text-2xl font-bold'
                        : 'text-base lg:text-lg'
                    }`}
                  >
                    {note.title}
                  </h3>
                  {note.folderType === 'object' && (
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-mono uppercase bg-[#eeeeee] text-[#555555] shrink-0">
                      Obj
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-hidden flex-nowrap min-w-0">
                  {note.topic && (
                    <span
                      className={`font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded shrink-0 whitespace-nowrap ${
                        isCenter ? 'bg-black text-white font-medium' : 'bg-[#f0f0f2] text-[#444444]'
                      }`}
                    >
                      {note.topic}
                    </span>
                  )}
                  {note.category && (
                    <span className="font-mono text-[9px] uppercase tracking-wider text-[#888888] truncate shrink-0">
                      {note.category}
                    </span>
                  )}
                </div>
              </div>

              {/* Right Side: tl;dr / Summary snippet */}
              <div className="hidden sm:flex flex-col items-end text-right justify-center max-w-[34%] shrink-0">
                <p className="text-[11px] text-[#666666] line-clamp-2 font-sans leading-tight">
                  {note.tldr || note.info || note.summary || 'Click to view details'}
                </p>
                <span className="text-[9px] font-mono text-[#999999] mt-1 flex items-center gap-0.5">
                  Open Note →
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
