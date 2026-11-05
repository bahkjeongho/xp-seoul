import React from 'react';
import type { NoteItem } from '../types';
import { ScrollLensStream } from './ScrollLensStream';
import { HistoryLensStream } from './HistoryLensStream';

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

  // When note is selected: Split middle column into Top (Recent History Lens Stream) + Bottom (Archive Scroll Stream)
  return (
    <div className="w-[280px] lg:w-[320px] h-full flex flex-col bg-[#fbfbfb] border-r border-[#e8e8e8] shrink-0 select-none overflow-hidden">
      {/* Upper Section: Recent History Lens Stream (Top 38% height) */}
      <div className="h-[38%] border-b border-[#e8e8e8] relative flex flex-col bg-[#fcfcfd] overflow-hidden">
        <HistoryLensStream
          historyNotes={historyNotes}
          selectedNote={selectedNote}
          onSelectNote={onSelectNote}
        />
      </div>

      {/* Lower Section: Compact Archive Scroll Stream (Bottom 62% height) */}
      <div className="flex-1 h-[62%] relative overflow-hidden flex flex-col">
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
