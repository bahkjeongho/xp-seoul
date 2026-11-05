import React from 'react';
import type { NoteItem } from '../types';
import { ScrollLensStream } from './ScrollLensStream';
import { History, ArrowRight } from 'lucide-react';

interface MiddleNavColumnProps {
  notes: NoteItem[];
  selectedNote: NoteItem | null;
  historyNotes: NoteItem[];
  onSelectNote: (note: NoteItem) => void;
  isCompact?: boolean;
}

export const MiddleNavColumn: React.FC<MiddleNavColumnProps> = ({
  notes,
  selectedNote,
  historyNotes,
  onSelectNote,
  isCompact = false,
}) => {
  if (!isCompact) {
    // Standard full-height lens stream on main page
    return (
      <ScrollLensStream
        notes={notes}
        selectedNote={selectedNote}
        onSelectNote={onSelectNote}
        isCompact={false}
      />
    );
  }

  // When note is selected: Split middle column into Top (Recent History) + Bottom (Scroll Stream)
  return (
    <div className="w-[280px] lg:w-[320px] h-full flex flex-col bg-[#fbfbfb] border-r border-[#e8e8e8] shrink-0 select-none overflow-hidden">
      {/* Upper Row: Visited Page History (Top 35% height) */}
      <div className="h-[36%] border-b border-[#e8e8e8] flex flex-col px-4 py-3 bg-white/70 overflow-hidden">
        <div className="flex items-center justify-between pb-2 mb-1 border-b border-[#eeeeee]">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[#888888] font-bold flex items-center gap-1.5">
            <History className="w-3 h-3 text-black" />
            <span>Recent History</span>
          </span>
          <span className="font-mono text-[9px] text-[#aaaaaa]">
            {historyNotes.length} notes
          </span>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col gap-1 pr-1">
          {historyNotes.map((hNote) => {
            const isCurrent = selectedNote?.id === hNote.id;
            return (
              <button
                key={hNote.id}
                onClick={() => onSelectNote(hNote)}
                className={`group flex items-center justify-between text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                  isCurrent
                    ? 'bg-black text-white font-medium'
                    : 'hover:bg-[#f2f2f4] text-[#333333]'
                }`}
              >
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="truncate font-sans font-medium text-[12px]">
                    {hNote.title}
                  </span>
                  {hNote.topic && (
                    <span
                      className={`font-mono text-[9px] uppercase tracking-wider truncate ${
                        isCurrent ? 'text-white/70' : 'text-[#888888]'
                      }`}
                    >
                      {hNote.topic}
                    </span>
                  )}
                </div>
                <ArrowRight className={`w-3 h-3 shrink-0 ${isCurrent ? 'text-white' : 'text-[#cccccc] group-hover:text-black'}`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Lower Row: Compact Scroll Lens Stream (Bottom 64% height) */}
      <div className="flex-1 h-[64%] relative overflow-hidden flex flex-col">
        <div className="px-4 py-1.5 border-b border-[#eeeeee] bg-[#f7f7f8] flex items-center justify-between text-[9px] font-mono uppercase text-[#888888]">
          <span>Archive Stream</span>
          <span>{notes.length} notes</span>
        </div>

        <div className="flex-1 relative overflow-hidden">
          <ScrollLensStream
            notes={notes}
            selectedNote={selectedNote}
            onSelectNote={onSelectNote}
            isCompact={true}
          />
        </div>
      </div>
    </div>
  );
};
