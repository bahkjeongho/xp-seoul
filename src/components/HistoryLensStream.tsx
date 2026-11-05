import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { NoteItem } from '../types';
import { motion } from 'framer-motion';
import { History, ArrowRight, ChevronUp, ChevronDown } from 'lucide-react';

interface HistoryLensStreamProps {
  historyNotes: NoteItem[];
  selectedNote: NoteItem | null;
  onSelectNote: (note: NoteItem) => void;
  mode?: 'top' | 'center';
}

export const HistoryLensStream: React.FC<HistoryLensStreamProps> = ({
  historyNotes,
  selectedNote,
  onSelectNote,
  mode = 'top',
}) => {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const scrollTimeoutRef = useRef<any>(null);
  const touchStartY = useRef<number | null>(null);

  const isCenterMode = mode === 'center';

  // Keep active index within bounds
  useEffect(() => {
    if (activeIndex >= historyNotes.length) {
      setActiveIndex(Math.max(0, historyNotes.length - 1));
    }
  }, [historyNotes.length]);

  // When selected note changes externally, if it is at index 0 (newly pushed), snap to 0
  useEffect(() => {
    if (selectedNote && historyNotes.length > 0 && historyNotes[0]?.id === selectedNote.id) {
      setActiveIndex(0);
    }
  }, [selectedNote, historyNotes]);

  // Smooth wheel navigation for History Lens
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.stopPropagation();
      e.preventDefault();
      clearTimeout(scrollTimeoutRef.current);

      const delta = e.deltaY;
      if (Math.abs(delta) < 8) return;

      const step = delta > 0 ? 1 : -1;
      setActiveIndex((prev) => {
        const next = prev + step;
        return Math.max(0, Math.min(historyNotes.length - 1, next));
      });
    },
    [historyNotes.length]
  );

  // Touch gesture support for mobile swiping
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const currentY = e.touches[0].clientY;
    const deltaY = touchStartY.current - currentY;
    if (Math.abs(deltaY) > 24) {
      const step = deltaY > 0 ? 1 : -1;
      setActiveIndex((prev) => Math.max(0, Math.min(historyNotes.length - 1, prev + step)));
      touchStartY.current = currentY;
    }
  };

  const handleTouchEnd = () => {
    touchStartY.current = null;
  };

  const handleStepUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => Math.max(0, prev - 1));
  };

  const handleStepDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => Math.min(historyNotes.length - 1, prev + 1));
  };

  if (historyNotes.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-[#999999] text-xs font-mono">
        <History className="w-4 h-4 mb-1.5 opacity-40" />
        <span>No visited history yet</span>
      </div>
    );
  }

  // Render window:
  // Center mode (Mobile): 4 items above and 4 items below center
  // Top mode (Desktop): 1 item above (if scrolled), active at top, up to 8 below
  const startIndex = isCenterMode
    ? Math.max(0, activeIndex - 4)
    : Math.max(0, activeIndex - 1);
  const endIndex = isCenterMode
    ? Math.min(historyNotes.length - 1, activeIndex + 4)
    : Math.min(historyNotes.length - 1, activeIndex + 8);
  const visibleItems = historyNotes.slice(startIndex, endIndex + 1);

  return (
    <div
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`w-full h-full flex flex-col overflow-hidden relative select-none ${
        isCenterMode ? 'bg-[#fbfbfb]' : ''
      }`}
    >
      {/* Top Header / Status Bar */}
      {isCenterMode ? (
        // Mobile Center Mode Status Indicator
        <div className="absolute top-3 inset-x-6 flex justify-between items-center text-[10px] font-mono uppercase tracking-wider text-[#999999] pointer-events-none z-30">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-black/50" />
            <span>
              {activeIndex + 1} / {historyNotes.length}
            </span>
          </span>
          <span className="text-[9px] text-[#aaaaaa]">Swipe or tap to jump</span>
        </div>
      ) : (
        // Desktop Top Mode Header Bar
        <div className="px-4 py-2 border-b border-[#eeeeee] flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-sm z-30">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[#888888] font-bold flex items-center gap-1.5">
            <History className="w-3 h-3 text-black" />
            <span>Recent History</span>
          </span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[9px] text-[#888888]">
              {activeIndex + 1} / {historyNotes.length}
            </span>
            <div className="flex items-center gap-0.5 ml-1">
              <button
                onClick={handleStepUp}
                disabled={activeIndex === 0}
                aria-label="Previous history note"
                className="p-0.5 rounded hover:bg-[#eaeaea] disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-[#555555]"
              >
                <ChevronUp className="w-3 h-3" />
              </button>
              <button
                onClick={handleStepDown}
                disabled={activeIndex >= historyNotes.length - 1}
                aria-label="Next history note"
                className="p-0.5 rounded hover:bg-[#eaeaea] disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-[#555555]"
              >
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Center Target Frame in Mobile Center Mode */}
      {isCenterMode && (
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center justify-center px-4 z-0">
          <div className="border border-black/10 rounded-2xl w-[calc(100%-36px)] max-w-[326px] h-[62px]" />
        </div>
      )}

      {/* Lens Stream Stack Area */}
      <div
        className={`flex-1 relative overflow-hidden flex justify-center ${
          isCenterMode ? 'items-center' : 'items-start pt-3.5'
        }`}
      >
        {visibleItems.map((note, idxInWindow) => {
          const actualIndex = startIndex + idxInWindow;
          const distance = actualIndex - activeIndex;
          const isFocus = distance === 0;
          const isCurrentlySelected = selectedNote?.id === note.id;

          let yOffset = 0;
          let scale = 1;
          let opacity = 1;
          let zIndex = 20;

          if (isCenterMode) {
            // Mobile: Central symmetric lens stream (active in middle, cards above/below)
            const absDist = Math.abs(distance);
            scale = Math.max(0.75, 1 - absDist * 0.075);
            opacity = Math.max(0.18, 1 - absDist * 0.22);
            yOffset = distance * 62;
            zIndex = 30 - absDist;
          } else {
            // Desktop: Top-anchored perspective lens stream
            if (distance === 0) {
              yOffset = 0;
              scale = 1;
              opacity = 1;
              zIndex = 30;
            } else if (distance > 0) {
              if (distance <= 4) {
                scale = 1 - distance * 0.03;      // 1: 0.97, 2: 0.94, 3: 0.91, 4: 0.88
                opacity = 1 - distance * 0.095;   // 1: 0.90, 2: 0.81, 3: 0.71, 4: 0.62
              } else {
                const beyond = distance - 4;
                scale = Math.max(0.68, 0.88 - beyond * 0.05);
                opacity = Math.max(0.08, 0.62 - beyond * 0.17); // 5th: 0.45, 6th: 0.28, 7th: 0.11
              }
              yOffset = distance * 42;
              zIndex = 20 - distance;
            } else {
              // distance < 0 (item scrolled above)
              yOffset = distance * 38;
              scale = Math.max(0.8, 1 + distance * 0.1);
              opacity = Math.max(0.1, 1 + distance * 0.5);
              zIndex = 10;
            }
          }

          return (
            <motion.div
              key={note.id}
              onClick={() => {
                setActiveIndex(actualIndex);
                onSelectNote(note);
              }}
              animate={{
                y: yOffset,
                x: '-50%',
                scale: scale,
                opacity: opacity,
              }}
              style={{ left: '50%', zIndex }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30,
                mass: 0.8,
              }}
              className={`absolute px-3.5 py-2 flex items-center justify-between rounded-xl transition-all cursor-pointer ${
                isCenterMode
                  ? 'w-[calc(100%-40px)] max-w-[320px] h-[52px]'
                  : 'w-[calc(100%-48px)] max-w-[280px] h-[48px]'
              } ${
                isFocus
                  ? isCurrentlySelected
                    ? 'bg-black text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)] border border-black ring-1 ring-black/20'
                    : 'bg-white text-black shadow-[0_8px_24px_rgba(0,0,0,0.10)] border border-black/15 ring-1 ring-black/5'
                  : 'bg-white/95 text-[#333333] border border-black/8 hover:bg-white hover:opacity-100 shadow-xs'
              }`}
            >
              {/* Left Side: Title & Topic */}
              <div className="flex flex-col justify-center min-w-0 pr-2">
                <span
                  className={`font-sans font-medium text-[13px] tracking-[-0.02em] truncate ${
                    isFocus && isCurrentlySelected ? 'text-white font-semibold' : 'text-black'
                  }`}
                >
                  {note.title}
                </span>
                {note.topic && (
                  <span
                    className={`font-mono text-[9px] uppercase tracking-wider truncate mt-0.5 ${
                      isFocus && isCurrentlySelected ? 'text-white/70' : 'text-[#888888]'
                    }`}
                  >
                    {note.topic}
                  </span>
                )}
              </div>

              {/* Right Side: Arrow Badge */}
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                  isFocus && isCurrentlySelected
                    ? 'bg-white/20 text-white'
                    : 'bg-[#f4f4f5] text-[#666666]'
                }`}
              >
                <ArrowRight className="w-2.5 h-2.5" />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
