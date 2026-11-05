import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { NoteItem } from '../types';
import { motion } from 'framer-motion';
import { Compass, ArrowRight, Check } from 'lucide-react';

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
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const scrollTimeoutRef = useRef<any>(null);

  // Keep active index in bounds if notes change
  useEffect(() => {
    if (activeIndex >= notes.length) {
      setActiveIndex(Math.max(0, notes.length - 1));
    }
  }, [notes.length]);

  // Sync active index if selectedNote is set from outside
  useEffect(() => {
    if (selectedNote) {
      const idx = notes.findIndex(n => n.id === selectedNote.id);
      if (idx !== -1 && idx !== activeIndex) {
        setActiveIndex(idx);
      }
    }
  }, [selectedNote, notes]);

  // Smooth wheel navigation with accumulator and damping
  const wheelAccumulatorRef = useRef<number>(0);
  const lastWheelTimeRef = useRef<number>(0);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();

    const now = performance.now();
    const dt = now - lastWheelTimeRef.current;
    lastWheelTimeRef.current = now;

    // Reset accumulator on pause (>140ms) to ensure clean stops
    if (dt > 140) {
      wheelAccumulatorRef.current = 0;
    }

    // Dampen trackpad flick spikes so cards glide smoothly without rushing
    const clampedDelta = Math.sign(e.deltaY) * Math.min(36, Math.abs(e.deltaY));
    wheelAccumulatorRef.current += clampedDelta;

    const THRESHOLD = 44; // Gentle, fluid trackpad threshold
    if (Math.abs(wheelAccumulatorRef.current) >= THRESHOLD) {
      const step = wheelAccumulatorRef.current > 0 ? 1 : -1;
      wheelAccumulatorRef.current = wheelAccumulatorRef.current > 0
        ? Math.max(0, wheelAccumulatorRef.current - THRESHOLD)
        : Math.min(0, wheelAccumulatorRef.current + THRESHOLD);

      setActiveIndex(prev => Math.max(0, Math.min(notes.length - 1, prev + step)));
    }
  }, [notes.length]);

  // Touch gesture support for mobile swiping with continuous drag feel
  const touchStartY = useRef<number | null>(null);
  const lastTouchYRef = useRef<number>(0);
  const touchAccumulatorRef = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    lastTouchYRef.current = e.touches[0].clientY;
    touchAccumulatorRef.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const currentY = e.touches[0].clientY;
    const dy = lastTouchYRef.current - currentY;
    lastTouchYRef.current = currentY;

    touchAccumulatorRef.current += dy;
    const TOUCH_THRESHOLD = 36; // Responsive mobile swipe threshold

    if (Math.abs(touchAccumulatorRef.current) >= TOUCH_THRESHOLD) {
      const step = touchAccumulatorRef.current > 0 ? 1 : -1;
      touchAccumulatorRef.current = touchAccumulatorRef.current > 0
        ? Math.max(0, touchAccumulatorRef.current - TOUCH_THRESHOLD)
        : Math.min(0, touchAccumulatorRef.current + TOUCH_THRESHOLD);

      setActiveIndex(prev => Math.max(0, Math.min(notes.length - 1, prev + step)));
    }
  };

  const handleTouchEnd = () => {
    touchStartY.current = null;
    touchAccumulatorRef.current = 0;
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => Math.min(notes.length - 1, prev + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'Enter') {
        const current = notes[activeIndex];
        if (current) onSelectNote(current);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [notes, activeIndex, onSelectNote]);

  const windowRadius = 4;
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
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="h-full w-full relative overflow-hidden flex flex-col items-center justify-center select-none touch-none bg-[#fbfbfb] transition-all duration-500"
      style={{ touchAction: 'none' }}
    >
      {/* Target Focus Ring (Figma frame style) */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center justify-center px-4">
        <div
          className={`border border-black/10 rounded-2xl pointer-events-none transition-all duration-500 ${
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
          <span className="hidden sm:inline">Scroll or use ↑ ↓ · Click to open note</span>
        )}
      </div>

      {/* The Central Lens Stream Stack */}
      <div className="relative w-full flex flex-col items-center justify-center h-[760px]">
        {visibleNotes.map((note, indexInWindow) => {
          const actualIndex = startIndex + indexInWindow;
          const distance = actualIndex - activeIndex;
          const isCenter = distance === 0;
          const isCurrentSelected = selectedNote?.id === note.id;

          // Scale & Opacity Calculations based on Distance
          const scale = isCompact
            ? Math.max(0.75, 1 - Math.abs(distance) * 0.08)
            : Math.max(0.68, 1 - Math.abs(distance) * 0.09);

          const opacity = Math.max(0.18, 1 - Math.abs(distance) * 0.24);
          const yOffset = distance * (isCompact ? 72 : 110);

          return (
            <motion.div
              key={note.id}
              onClick={() => {
                setActiveIndex(actualIndex);
                onSelectNote(note);
              }}
              initial={{
                y: distance > 0 ? yOffset + 45 : yOffset - 45,
                x: '-50%',
                scale: scale * 0.96,
                opacity: 0,
              }}
              animate={{
                y: yOffset,
                x: '-50%',
                scale: scale,
                opacity: opacity,
              }}
              exit={{
                y: distance > 0 ? yOffset + 45 : yOffset - 45,
                x: '-50%',
                scale: scale * 0.96,
                opacity: 0,
              }}
              style={{ left: '50%' }}
              transition={{
                type: 'spring',
                stiffness: 155,
                damping: 24,
                mass: 0.7,
              }}
              whileHover={{
                scale: scale * 1.02,
                cursor: 'pointer',
              }}
              className={`absolute flex items-center justify-between rounded-xl transition-colors select-none touch-none ${
                isCenter
                  ? 'bg-white shadow-[0_14px_36px_rgba(0,0,0,0.08)] border border-black/10 ring-1 ring-black/5 z-20'
                  : 'bg-white/80 border border-black/5 z-10 hover:bg-white hover:opacity-90'
              } ${
                isCompact
                  ? 'w-[calc(100%-48px)] max-w-[280px] h-[82px] px-3.5 py-2.5'
                  : 'w-[calc(100vw-32px)] max-w-[350px] sm:max-w-[500px] md:max-w-[620px] lg:max-w-[700px] h-[110px] sm:h-[120px] lg:h-[132px] px-4 sm:px-6 py-3 sm:py-4'
              }`}
            >
              {/* Left Side: Title & Topic */}
              <div className="flex flex-col justify-center gap-1.5 flex-1 min-w-0 pr-3">
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

              {/* Right Side: tl;dr and Info Callout Snippets (Hidden or minimal in compact / mobile mode) */}
              {!isCompact ? (
                <>
                  <div className="hidden sm:flex flex-col justify-center items-end text-right w-[240px] lg:w-[280px] pl-4 border-l border-[#f0f0f0]">
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
                  <div className="sm:hidden shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-[#f4f4f4] text-black">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </>
              ) : (
                <div className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-[#f4f4f4] text-black">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Bottom Stream Progress Bar */}
      <div className="absolute bottom-6 inset-x-8 flex flex-col gap-1 items-center z-10 pointer-events-none">
        <div className={`h-0.5 bg-[#e0e0e0] rounded-full overflow-hidden ${isCompact ? 'w-24' : 'w-48'}`}>
          <div
            className="h-full bg-black transition-all duration-150 rounded-full"
            style={{ width: `${((activeIndex + 1) / notes.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
