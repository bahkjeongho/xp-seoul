import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { NoteItem } from '../types';
import { Compass, ArrowRight } from 'lucide-react';

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

  // Continuous floating-point scroll position for 120fps fluid physics
  const [scrollPos, setScrollPos] = useState<number>(0);
  const currentPosRef = useRef<number>(0);
  currentPosRef.current = scrollPos;

  const targetPosRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const snapTimeoutRef = useRef<any>(null);

  // Card Step Geometry (distance in pixels between adjacent items)
  const STEP_PX = isCompact ? 76 : 116;

  // Frame-rate independent exponential interpolation loop (Lenis / Apple physics)
  const startSpringLoop = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.04, (now - lastTime) / 1000);
      lastTime = now;

      const target = targetPosRef.current;
      const current = currentPosRef.current;
      const diff = target - current;

      // Frame-rate independent critically-damped spring decay (smooth at both 60Hz and 120Hz ProMotion)
      const factor = 1 - Math.exp(-18 * dt);
      const next = current + diff * factor;

      if (Math.abs(diff) < 0.001) {
        currentPosRef.current = target;
        setScrollPos(target);
        animFrameRef.current = null;
        return;
      }

      currentPosRef.current = next;
      setScrollPos(next);
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
  }, []);

  // Snap to specific index
  const snapTo = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(notes.length - 1, index));
    targetPosRef.current = clamped;
    startSpringLoop();
  }, [notes.length, startSpringLoop]);

  // Sync active index if selectedNote is set from outside
  useEffect(() => {
    if (selectedNote) {
      const idx = notes.findIndex((n) => n.id === selectedNote.id);
      if (idx !== -1 && idx !== Math.round(targetPosRef.current)) {
        snapTo(idx);
      }
    }
  }, [selectedNote, notes, snapTo]);

  // Native non-passive touch & wheel event listeners for 100% fluid, interruption-free scrolling
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // --- 1. TRACKPAD & MOUSE WHEEL (Continuous Smooth Flow) ---
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();

      // Continuous wheel nudge
      const deltaItems = (e.deltaY / STEP_PX) * 0.42;
      let newTarget = targetPosRef.current + deltaItems;
      newTarget = Math.max(0, Math.min(notes.length - 1, newTarget));
      targetPosRef.current = newTarget;

      startSpringLoop();

      // Settle gently onto nearest whole item when scrolling pauses
      clearTimeout(snapTimeoutRef.current);
      snapTimeoutRef.current = setTimeout(() => {
        targetPosRef.current = Math.round(targetPosRef.current);
        startSpringLoop();
      }, 100);
    };

    // --- 2. MOBILE TOUCH GESTURES (1:1 Direct Finger Tracking + Inertia Flick) ---
    let isDragging = false;
    let touchStartY = 0;
    let touchStartPos = 0;
    let lastTouchY = 0;
    let lastTouchTime = 0;
    let touchVelocity = 0; // in px / sec

    const onTouchStart = (e: TouchEvent) => {
      if ((e.target as HTMLElement).closest('.interactive-control')) return;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      clearTimeout(snapTimeoutRef.current);

      const touch = e.touches[0];
      if (!touch) return;

      isDragging = true;
      touchStartY = touch.clientY;
      touchStartPos = currentPosRef.current;
      lastTouchY = touch.clientY;
      lastTouchTime = performance.now();
      touchVelocity = 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      if (e.cancelable) e.preventDefault();

      const touch = e.touches[0];
      if (!touch) return;

      const currentY = touch.clientY;
      const dy = touchStartY - currentY; // dragging finger up = moving stream down
      const deltaItems = dy / STEP_PX;

      let newPos = touchStartPos + deltaItems;
      // Soft boundary spring resistance
      if (newPos < 0) newPos *= 0.35;
      if (newPos > notes.length - 1) {
        const over = newPos - (notes.length - 1);
        newPos = notes.length - 1 + over * 0.35;
      }

      const now = performance.now();
      const dt = Math.max(1, now - lastTouchTime);
      touchVelocity = ((currentY - lastTouchY) / dt) * 1000;
      lastTouchY = currentY;
      lastTouchTime = now;

      currentPosRef.current = newPos;
      targetPosRef.current = newPos;
      setScrollPos(newPos);
    };

    const onTouchEnd = () => {
      if (!isDragging) return;
      isDragging = false;

      // Project momentum from release velocity
      const velocityItems = -touchVelocity / STEP_PX;
      const momentumProjected = velocityItems * 0.22;

      let snappedTarget = Math.round(currentPosRef.current + momentumProjected);
      snappedTarget = Math.max(0, Math.min(notes.length - 1, snappedTarget));

      targetPosRef.current = snappedTarget;
      startSpringLoop();
    };

    // Attach non-passive listeners for smooth continuous response
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: false });
    window.addEventListener('touchcancel', onTouchEnd, { passive: false });

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [STEP_PX, notes.length, startSpringLoop]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        snapTo(Math.min(notes.length - 1, Math.round(targetPosRef.current) + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        snapTo(Math.max(0, Math.round(targetPosRef.current) - 1));
      } else if (e.key === 'Enter') {
        const current = notes[Math.round(currentPosRef.current)];
        if (current) onSelectNote(current);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [notes, snapTo, onSelectNote]);

  const activeIndex = Math.max(0, Math.min(notes.length - 1, Math.round(scrollPos)));
  const windowRadius = 5;
  const startIndex = Math.max(0, Math.floor(scrollPos) - windowRadius);
  const endIndex = Math.min(notes.length - 1, Math.ceil(scrollPos) + windowRadius);
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
      className="h-full w-full relative overflow-hidden flex flex-col items-center justify-center select-none touch-none bg-[#fbfbfb]"
      style={{
        touchAction: 'none',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
    >
      {/* Target Focus Ring (Figma frame style) */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center justify-center px-4 z-0">
        <div
          className={`border border-black/10 rounded-2xl pointer-events-none transition-all duration-300 ${
            isCompact
              ? 'w-[260px] lg:w-[290px] h-[90px]'
              : 'w-full max-w-[360px] sm:max-w-[520px] md:max-w-[640px] lg:max-w-[720px] h-[120px] sm:h-[130px] lg:h-[140px]'
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
          <span className="hidden sm:inline">Scroll freely or use ↑ ↓ · Click to open note</span>
        )}
      </div>

      {/* The Central Lens Stream Stack (Continuous Subpixel Rendering) */}
      <div className="relative w-full flex flex-col items-center justify-center h-[760px] pointer-events-none">
        {visibleNotes.map((note, indexInWindow) => {
          const actualIndex = startIndex + indexInWindow;
          const distance = actualIndex - scrollPos; // Smooth continuous float
          const absDist = Math.abs(distance);
          const isCenter = absDist < 0.5;

          // Scale & Opacity Calculations smoothly modulated by continuous distance
          const scale = isCompact
            ? Math.max(0.74, 1 - absDist * 0.08)
            : Math.max(0.68, 1 - absDist * 0.085);

          const opacity = Math.max(0.08, Math.min(1, 1 - Math.pow(absDist / 4.2, 1.8)));
          const yOffset = distance * STEP_PX;
          const zIndex = Math.round((1 - Math.min(1, absDist / 6)) * 40);

          return (
            <div
              key={note.id}
              onClick={() => {
                snapTo(actualIndex);
                onSelectNote(note);
              }}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: `translate3d(-50%, calc(-50% + ${yOffset}px), 0px) scale(${scale})`,
                opacity: opacity,
                zIndex: zIndex,
                pointerEvents: opacity > 0.2 ? 'auto' : 'none',
                willChange: 'transform, opacity',
              }}
              className={`flex items-center justify-between rounded-xl select-none touch-none cursor-pointer transition-shadow duration-200 ${
                isCenter
                  ? 'bg-white shadow-[0_14px_36px_rgba(0,0,0,0.08)] border border-black/10 ring-1 ring-black/5'
                  : 'bg-white/80 border border-black/5 hover:bg-white hover:opacity-95'
              } ${
                isCompact
                  ? 'w-[calc(100%-48px)] max-w-[280px] h-[82px] px-3.5 py-2.5'
                  : 'w-[calc(100vw-32px)] max-w-[350px] sm:max-w-[500px] md:max-w-[620px] lg:max-w-[700px] h-[110px] sm:h-[120px] lg:h-[132px] px-4 sm:px-6 py-3 sm:py-4'
              }`}
            >
              {/* Left Side: Title & Topic */}
              <div className="flex flex-col justify-center gap-1.5 flex-1 min-w-0 pr-3 pointer-events-none">
                <div className="flex items-center gap-2">
                  <h3
                    className={`font-semibold tracking-[-0.03em] truncate text-black font-sans ${
                      isCompact
                        ? 'text-sm'
                        : isCenter
                        ? 'text-xl lg:text-2xl font-bold'
                        : 'text-base lg:text-lg'
                    }`}
                  >
                    {note.title}
                  </h3>
                  {note.folderType === 'object' && (
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-mono uppercase bg-[#eeeeee] text-[#555555]">
                      Obj
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {note.topic && (
                    <span
                      className={`font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded ${
                        isCenter ? 'bg-black text-white font-medium' : 'bg-[#f0f0f2] text-[#444444]'
                      }`}
                    >
                      {note.topic}
                    </span>
                  )}
                  {note.cities.length > 0 && !isCompact && (
                    <span className="font-mono text-[10px] text-[#777777]">
                      {note.cities[0]}
                    </span>
                  )}
                </div>
              </div>

              {/* Right Side: tl;dr and Info Callout Snippets */}
              {!isCompact ? (
                <>
                  <div className="hidden sm:flex flex-col justify-center items-end text-right w-[240px] lg:w-[280px] pl-4 border-l border-[#f0f0f0] pointer-events-none">
                    {note.tldr ? (
                      <p className="text-xs text-[#333333] leading-snug line-clamp-2 font-sans mb-1.5">
                        {note.tldr}
                      </p>
                    ) : note.info ? (
                      <p className="text-xs text-[#555555] leading-snug line-clamp-2 font-sans mb-1.5">
                        {note.info}
                      </p>
                    ) : (
                      <p className="text-[11px] font-mono text-[#aaaaaa] italic">
                        Click to explore full note
                      </p>
                    )}

                    <div className="flex items-center gap-1 text-[11px] font-mono text-[#888888]">
                      <span>Open Note</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                  <div className="sm:hidden shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-[#f4f4f4] text-black pointer-events-none">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </>
              ) : (
                <div className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-[#f4f4f4] text-black pointer-events-none">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Stream Progress Bar (Smooth Continuous Scrubber) */}
      <div className="absolute bottom-6 inset-x-8 flex flex-col gap-1 items-center z-10 pointer-events-none">
        <div className={`h-0.5 bg-[#e0e0e0] rounded-full overflow-hidden ${isCompact ? 'w-24' : 'w-48'}`}>
          <div
            className="h-full bg-black rounded-full"
            style={{ width: `${Math.max(1, Math.min(100, ((scrollPos + 1) / notes.length) * 100))}%` }}
          />
        </div>
      </div>
    </div>
  );
};
