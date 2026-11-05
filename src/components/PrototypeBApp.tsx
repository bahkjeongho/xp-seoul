import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { NoteItem } from '../types';
import { TopFilterBarHybrid, type PrototypeBFilterState } from './TopFilterBarHybrid';
import type { FacetTaxonomyData } from './TopFilterBarFacet';
import { MiddleNavColumn } from './MiddleNavColumn';
import { NoteDetailPanel } from './NoteDetailPanel';
import { MenuNav } from './MenuNav';
import { AnimatePresence } from 'framer-motion';

interface PrototypeBAppProps {
  initialNotes?: NoteItem[];
  facetData: FacetTaxonomyData;
}

export const PrototypeBApp: React.FC<PrototypeBAppProps> = ({
  initialNotes = [],
  facetData,
}) => {
  const [notes] = useState<NoteItem[]>(initialNotes);
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);
  const [historyNotes, setHistoryNotes] = useState<NoteItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [filterState, setFilterState] = useState<PrototypeBFilterState>({
    category: null,
    subCategory: null,
    type: null,
    field: null,
    topic: null,
  });

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const knownTitles = useMemo(() => {
    const s = new Set<string>();
    for (const n of notes) {
      s.add(n.title.toLowerCase());
      s.add(n.id.toLowerCase());
      if (n.aliases) n.aliases.forEach((a) => s.add(a.toLowerCase()));
    }
    return s;
  }, [notes]);

  const selectNoteWithHistory = useCallback((note: NoteItem | null) => {
    setSelectedNote(note);
    if (note) {
      setHistoryNotes((prev) => {
        const next = [note, ...prev.filter((n) => n.id !== note.id)];
        return next.slice(0, 10);
      });
    }
  }, []);

  const handleResetFilters = () => {
    setFilterState({
      category: null,
      subCategory: null,
      type: null,
      field: null,
      topic: null,
    });
    setSearchQuery('');
  };

  // Filter notes in parallel (Category AND Type AND Field AND Topic)
  const filteredNotes = useMemo(() => {
    let result = notes;

    if (filterState.category) {
      result = result.filter((n) => n.category === filterState.category);
    }
    if (filterState.subCategory) {
      result = result.filter((n) => n.subCategory === filterState.subCategory);
    }
    if (filterState.type) {
      result = result.filter((n) => n.type === filterState.type);
    }
    if (filterState.field) {
      result = result.filter((n) => n.field === filterState.field);
    }
    if (filterState.topic) {
      result = result.filter(
        (n) => n.topic === filterState.topic || (n.topics && n.topics.includes(filterState.topic!))
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((n) => {
        return (
          n.title.toLowerCase().includes(q) ||
          (n.aliases && n.aliases.some((a) => a.toLowerCase().includes(q))) ||
          (n.topic && n.topic.toLowerCase().includes(q)) ||
          (n.tldr && n.tldr.toLowerCase().includes(q))
        );
      });
    }

    return result;
  }, [notes, filterState, searchQuery]);

  const isDetailOpen = Boolean(selectedNote);

  return (
    <div className="w-screen h-screen flex flex-col bg-[#fbfbfb] text-black overflow-hidden font-sans select-none">
      {/* Top Header Bar */}
      <header className="w-full h-[57px] bg-white border-b border-[#eeeeee] px-4 lg:px-8 flex items-center justify-between z-40 shrink-0">
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="font-black text-xl lg:text-2xl tracking-[-0.04em] text-black hover:opacity-75 transition-opacity"
          >
            XP Seoul
          </a>
          <div className="flex items-center bg-[#f4f4f5] p-0.5 rounded-full border border-black/8 text-[11px]">
            <a href="/" className="px-3 py-1 rounded-full text-[#666666] hover:text-black">
              Production (Current)
            </a>
            <a href="/prototype-a" className="px-3 py-1 rounded-full text-[#666666] hover:text-black">
              Prototype A
            </a>
            <span className="px-3 py-1 rounded-full bg-black text-white font-semibold">
              Prototype B
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="text-[#888888]">
            Filtered Notes: <strong className="text-black font-semibold">{filteredNotes.length.toLocaleString()}</strong>
          </span>
        </div>
      </header>

      {/* Top Hybrid Filter Bar */}
      <TopFilterBarHybrid
        facetData={facetData}
        totalNotesCount={notes.length}
        filteredNotesCount={filteredNotes.length}
        filterState={filterState}
        onFilterChange={setFilterState}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onReset={handleResetFilters}
      />

      {/* Main Content Canvas */}
      <main className="flex-1 h-full flex overflow-hidden relative">
        {!isDetailOpen ? (
          <div className="flex-1 h-full relative overflow-hidden flex items-center justify-center">
            <MiddleNavColumn
              notes={filteredNotes}
              selectedNote={null}
              historyNotes={historyNotes}
              onSelectNote={(note) => selectNoteWithHistory(note)}
              isCompact={false}
            />
          </div>
        ) : (
          <div className="flex-1 h-full flex overflow-hidden">
            <div className="hidden md:flex h-full shrink-0">
              <MiddleNavColumn
                notes={filteredNotes}
                selectedNote={selectedNote}
                historyNotes={historyNotes}
                onSelectNote={(note) => selectNoteWithHistory(note)}
                isCompact={true}
                onGoHome={() => selectNoteWithHistory(null)}
              />
            </div>

            <AnimatePresence>
              <NoteDetailPanel
                note={selectedNote!}
                knownTitles={knownTitles}
                onClose={() => selectNoteWithHistory(null)}
                onNavigateWikilink={(target) => {
                  const match = notes.find(
                    (n) => n.id.toLowerCase() === target.toLowerCase() || n.title.toLowerCase() === target.toLowerCase()
                  );
                  if (match) selectNoteWithHistory(match);
                }}
                isMobile={isMobile}
              />
            </AnimatePresence>

            <div className="hidden md:flex shrink-0">
              <MenuNav activeMenu="wiki" onSelectMenu={() => {}} isCompact={true} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
