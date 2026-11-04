import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { NoteItem } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, BookOpen, ExternalLink, ArrowRight } from 'lucide-react';

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
  const [isScrolling, setIsScrolling] = useState<boolean>(false);
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

  // Handle smooth wheel navigation with momentum damping
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setIsScrolling(true);
    clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => setIsScrolling(false), 200);

    const delta = e.deltaY;
    if (Math.abs(delta) < 8) return;

    const step = delta > 0 ? 1 : -1;
    setActiveIndex(prev => {
      const next = prev + step;
      return Math.max(0, Math.min(notes.length - 1, next));
    });
  }, [notes.length]);

  // Keyboard navigation (Arrow keys)
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

  // Calculate visible window around activeIndex (e.g. 5 above, 5 below)
  const windowRadius = 4;
  const startIndex = Math.max(0, activeIndex - windowRadius);
  const endIndex = Math.min(notes.length - 1, activeIndex + windowRadius);
  const visibleNotes = notes.slice(startIndex, endIndex + 1);

  if (notes.length === 0) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center p-8 text-center text-[#888888]">
        <Compass className="w-10 h-10 mb-3 stroke-[1.2] text-[#cccccc] animate-spin" style={{ animationDuration: '8s' }} />
        <p className="font-mono text-sm tracking-wider uppercase font-semibold text-black mb-1">No Notes Match Selected Filters</p>
        <p className="text-xs text-[#777777] max-w-sm">Try resetting filters on the left or search with different keywords.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      className="flex-1 h-full relative overflow-hidden flex flex-col items-center justify-center select-none bg-[#fafafa]"
    >
      {/* Background Subtle Stream Guides */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center justify-center">
        {/* Active Focus Target Frame Ring */}
        <div className={`border border-black/10 rounded-2xl pointer-events-none transition-all duration-300 ${isCompact ? 'w-[420px] h-[92px]' : 'w-[480px] lg:w-[540px] h-[110px]'}`} />
      </div>

      {/* Counter and Guide on Top */}
      <div className="absolute top-6 inset-x-8 flex justify-between items-center text-[10px] font-mono uppercase tracking-wider text-[#999999] pointer-events-none z-10">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-black/40" />
          <span>Stream Lens ({activeIndex + 1} of {notes.length})</span>
        </span>
        <span className="hidden sm:inline">Use Mouse Wheel / ↑ ↓ to browse · Click to expand</span>
      </div>

      {/* The Lens Stream Stack */}
      <div className="relative w-full flex flex-col items-center justify-center h-[760px]">
        {visibleNotes.map((note, indexInWindow) => {
          const actualIndex = startIndex + indexInWindow;
          const distance = actualIndex - activeIndex; // 0 for center, -1 for above, 1 for below
          const isCenter = distance === 0;

          // Scale & Opacity Calculations based on Distance
          const scale = Math.max(0.65, 1 - Math.abs(distance) * 0.08);
          const opacity = Math.max(0.2, 1 - Math.abs(distance) * 0.22);
          const yOffset = distance * (isCompact ? 76 : 94);

          return (
            <motion.div
              key={note.id}
              onClick={() => {
                setActiveIndex(actualIndex);
                onSelectNote(note);
              }}
              animate={{
                y: yOffset,
                scale: scale,
                opacity: opacity,
              }}
              transition={{
                type: 'spring',
                stiffness: 280,
                damping: 32,
                mass: 0.8,
              }}
              whileHover={{
                scale: scale * 1.03,
                cursor: 'pointer',
              }}
              className={`absolute flex items-center justify-between p-4 rounded-xl transition-all ${
                isCenter
                  ? 'bg-white shadow-[0_12px_32px_rgba(0,0,0,0.08)] border border-black/10 ring-1 ring-black/5 z-20'
                  : 'bg-white/80 border border-black/5 z-10 hover:bg-white hover:opacity-90'
              } ${isCompact ? 'w-[400px] h-[86px]' : 'w-[460px] lg:w-[520px] h-[104px]'}`}
            >
              {/* Left Side: Title & Topic */}
              <div className="flex flex-col justify-center gap-1.5 flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2">
                  <h3 className={`font-semibold tracking-[-0.03em] truncate text-black font-sans ${isCenter ? 'text-base lg:text-lg' : 'text-sm'}`}>
                    {note.title}
                  </h3>
                  {note.folderType === 'object' && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-[#eeeeee] text-[#555555]">
                      Object
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {note.topic && (
                    <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded bg-[#f0f0f2] text-[#444444] font-medium">
                      {note.topic}
                    </span>
                  )}
                  {note.cities.length > 0 && (
                    <span className="font-mono text-[9px] text-[#888888]">
                      {note.cities[0]}
                    </span>
                  )}
                </div>
              </div>

              {/* Right Side: tl;dr and Info Callout Snippets */}
              <div className="flex flex-col justify-center items-end text-right w-[180px] lg:w-[220px] pl-3 border-l border-[#f0f0f0]">
                {note.tldr ? (
                  <p className="text-[11px] text-[#444444] leading-tight line-clamp-2 font-sans mb-1">
                    {note.tldr}
                  </p>
                ) : note.info ? (
                  <p className="text-[11px] text-[#666666] leading-tight line-clamp-2 font-sans mb-1">
                    {note.info}
                  </p>
                ) : (
                  <p className="text-[10px] font-mono text-[#bbbbbb] italic">
                    Open to view note details
                  </p>
                )}

                <div className="flex items-center gap-1 text-[10px] font-mono text-[#999999] group-hover:text-black">
                  <span>View</span>
                  <ArrowRight className="w-2.5 h-2.5" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Bottom Stream Progress Bar */}
      <div className="absolute bottom-6 inset-x-12 flex flex-col gap-1 items-center z-10 pointer-events-none">
        <div className="w-48 h-0.5 bg-[#e5e5e5] rounded-full overflow-hidden">
          <div
            className="h-full bg-black transition-all duration-150 rounded-full"
            style={{ width: `${((activeIndex + 1) / notes.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
