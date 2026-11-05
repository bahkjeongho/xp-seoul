import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { NoteItem } from '../types';
import { motion } from 'framer-motion';
import { History, ArrowRight, ChevronUp, ChevronDown } from 'lucide-react';

interface HistoryLensStreamProps {
  historyNotes: NoteItem[];
  selectedNote: NoteItem | null;
  onSelectNote: (note: NoteItem) => void;
}

export const HistoryLensStream: React.FC<HistoryLensStreamProps> = ({
  historyNotes,
  selectedNote,
  onSelectNote,
}) => {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const scrollTimeoutRef = useRef<any>(null);

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

  // Render window: show active item at the top, plus up to 4 items below, and 1 item above if scrolled
  const startIndex = Math.max(0, activeIndex - 1);
  const endIndex = Math.min(historyNotes.length - 1, activeIndex + 4);
  const visibleItems = historyNotes.slice(startIndex, endIndex + 1);

  return (
    <div
      onWheel={handleWheel}
      className="w-full h-full flex flex-col overflow-hidden relative select-none"
    >
      {/* Header Bar */}
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

      {/* Top Lens Stack Area */}
      <div className="flex-1 relative overflow-hidden flex items-start justify-center pt-3">
        {visibleItems.map((note, idxInWindow) => {
          const actualIndex = startIndex + idxInWindow;
          const distance = actualIndex - activeIndex;
          const isTopFocus = distance === 0;
          const isCurrentlySelected = selectedNote?.id === note.id;

          // Top-anchored perspective calculations:
          // distance = 0 (top focus card): scale 1.0, opacity 1.0, y = 0
          // distance > 0 (downwards): scale decreases, opacity fades out smoothly
          // distance < 0 (scrolled upwards past top): pushed up and fades
          let yOffset = 0;
          let scale = 1;
          let opacity = 1;
          let zIndex = 20;

          if (distance === 0) {
            yOffset = 0;
            scale = 1;
            opacity = 1;
            zIndex = 30;
          } else if (distance > 0) {
            yOffset = distance * 62;
            scale = Math.max(0.74, 1 - distance * 0.065);
            opacity = Math.max(0.12, 1 - distance * 0.22);
            zIndex = 20 - distance;
          } else {
            // distance < 0 (item scrolled above)
            yOffset = distance * 48;
            scale = Math.max(0.8, 1 + distance * 0.1);
            opacity = Math.max(0.1, 1 + distance * 0.5);
            zIndex = 10;
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
                scale: scale,
                opacity: opacity,
              }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30,
                mass: 0.8,
              }}
              whileHover={{
                scale: scale * 1.02,
                cursor: 'pointer',
              }}
              style={{ zIndex }}
              className={`absolute w-[250px] lg:w-[280px] h-[58px] px-3.5 py-2 flex items-center justify-between rounded-xl transition-all cursor-pointer ${
                isTopFocus
                  ? isCurrentlySelected
                    ? 'bg-black text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)] border border-black ring-1 ring-black/20'
                    : 'bg-white text-black shadow-[0_8px_24px_rgba(0,0,0,0.08)] border border-black/15 ring-1 ring-black/5'
                  : 'bg-white/90 text-[#333333] border border-black/8 hover:bg-white hover:opacity-90 shadow-sm'
              }`}
            >
              {/* Left Side: Title & Topic */}
              <div className="flex flex-col justify-center min-w-0 pr-2">
                <span
                  className={`font-sans font-medium text-[13px] tracking-[-0.02em] truncate ${
                    isTopFocus && isCurrentlySelected ? 'text-white font-semibold' : 'text-black'
                  }`}
                >
                  {note.title}
                </span>
                {note.topic && (
                  <span
                    className={`font-mono text-[9px] uppercase tracking-wider truncate mt-0.5 ${
                      isTopFocus && isCurrentlySelected ? 'text-white/70' : 'text-[#888888]'
                    }`}
                  >
                    {note.topic}
                  </span>
                )}
              </div>

              {/* Right Side: Arrow Badge */}
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                  isTopFocus && isCurrentlySelected
                    ? 'bg-white/20 text-white'
                    : 'bg-[#f4f4f5] text-[#666666]'
                }`}
              >
                <ArrowRight className="w-3 h-3" />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
