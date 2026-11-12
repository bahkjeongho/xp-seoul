import React, { useState, useMemo } from 'react';
import type { NoteItem, TaxonomyData } from '../types';
import { ScrollLensStream } from './ScrollLensStream';
import { HistoryLensStream } from './HistoryLensStream';
import { LinkedMentionsView } from './LinkedMentionsView';
import { RotateCcw, ChevronRight, ChevronDown, Link2, History } from 'lucide-react';

interface MiddleNavColumnProps {
  notes: NoteItem[];
  allNotes?: NoteItem[];
  selectedNote: NoteItem | null;
  historyNotes: NoteItem[];
  backlinks?: Record<string, { sourceId: string; context: string }[]> | null;
  onSelectNote: (note: NoteItem) => void;
  isCompact?: boolean;
  onGoHome?: () => void;
  taxonomy?: TaxonomyData;
  totalNotesCount?: number;
  selectedCategory?: string | null;
  selectedSubCategory?: string | null;
  selectedTopic?: string | null;
  onSelectCategory?: (cat: string | null) => void;
  onSelectSubCategory?: (subCat: string | null) => void;
  onSelectTopic?: (topic: string | null) => void;
  onResetFilters?: () => void;
}

export const MiddleNavColumn: React.FC<MiddleNavColumnProps> = ({
  notes,
  allNotes,
  selectedNote,
  historyNotes,
  backlinks,
  onSelectNote,
  isCompact = false,
  onGoHome,
  taxonomy = {},
  totalNotesCount = notes.length,
  selectedCategory = null,
  selectedSubCategory = null,
  selectedTopic = null,
  onSelectCategory,
  onSelectSubCategory,
  onSelectTopic,
  onResetFilters,
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

  // Categories sorted by note count
  const categories = Object.keys(taxonomy).sort((a, b) => {
    return (taxonomy[b]?.count || 0) - (taxonomy[a]?.count || 0);
  });

  const currentCategoryData = selectedCategory ? taxonomy[selectedCategory] : null;
  const subCategories = currentCategoryData
    ? Object.keys(currentCategoryData.subCategories || {}).sort(
        (a, b) => currentCategoryData.subCategories[b].count - currentCategoryData.subCategories[a].count
      )
    : [];

  const currentSubCategoryData =
    selectedCategory && selectedSubCategory && currentCategoryData?.subCategories[selectedSubCategory]
      ? currentCategoryData.subCategories[selectedSubCategory]
      : null;
  const topics = currentSubCategoryData
    ? Object.keys(currentSubCategoryData.topics || {}).sort(
        (a, b) => currentSubCategoryData.topics[b] - currentSubCategoryData.topics[a]
      )
    : [];

  const hasActiveFilter = Boolean(selectedCategory || selectedSubCategory || selectedTopic);

  // Upper section accordion tab: 'mentions' (default open) or 'history'
  const [upperTab, setUpperTab] = useState<'mentions' | 'history'>('mentions');

  // Calculate unique linked mentions count for selectedNote
  const mentionsCount = useMemo(() => {
    if (!selectedNote || !backlinks) return 0;
    const targets = [selectedNote.id, selectedNote.title];
    if (selectedNote.aliases && Array.isArray(selectedNote.aliases)) {
      targets.push(...selectedNote.aliases);
    }
    const currentIdLower = selectedNote.id.toLowerCase();
    const currentTitleLower = selectedNote.title.toLowerCase();
    const seenContexts = new Set<string>();

    for (const tgt of targets) {
      const entries = backlinks[tgt.toLowerCase()];
      if (entries && Array.isArray(entries)) {
        for (const entry of entries) {
          if (
            entry.sourceId.toLowerCase() === currentIdLower ||
            entry.sourceId.toLowerCase() === currentTitleLower
          ) {
            continue;
          }
          const key = `${entry.sourceId.toLowerCase()}::${entry.context}`;
          seenContexts.add(key);
        }
      }
    }
    return seenContexts.size;
  }, [selectedNote, backlinks]);

  // When note is selected: Unified Navigation Column
  return (
    <div className="w-[280px] lg:w-[320px] h-full flex flex-col bg-[#fbfbfb] border-r border-[#e8e8e8] shrink-0 select-none overflow-hidden">
      {/* (1) Top Brand Header with Home Navigation (Clean logo without ESC pill) */}
      <div className="px-4 py-2 border-b border-[#eeeeee] flex items-center justify-between bg-white shrink-0">
        <button
          onClick={onGoHome}
          title="Return to Main Overview"
          className="flex items-center gap-1.5 group text-left"
        >
          <span className="font-black text-lg tracking-tight text-black font-sans group-hover:opacity-60 transition-opacity">
            XP Seoul
          </span>
        </button>

        <span className="font-mono text-[9px] text-[#888888]">
          {notes.length} notes
        </span>
      </div>

      {/* (2) Upper Section: Accordion Container for Linked Mentions & Recent History (~38% height) */}
      <div className="h-[38%] min-h-[310px] max-h-[380px] border-b border-[#e8e8e8] relative flex flex-col bg-[#fcfcfd] shrink-0 overflow-hidden">
        {upperTab === 'mentions' ? (
          <>
            {/* Header: Linked Mentions (Expanded) */}
            <div
              onClick={() => setUpperTab('history')}
              className="px-3.5 py-2 border-b border-[#eeeeee] flex items-center justify-between shrink-0 bg-white z-20 cursor-pointer hover:bg-[#fafafa] transition-colors select-none"
              title="Click to toggle Recent History"
            >
              <span className="font-mono text-[10px] uppercase tracking-wider text-black font-bold flex items-center gap-1.5">
                <ChevronDown className="w-3.5 h-3.5 text-black" />
                <Link2 className="w-3.5 h-3.5 text-black" />
                <span>Linked Mentions</span>
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[9px] text-white bg-black px-1.5 py-0.2 rounded-full font-semibold">
                  {mentionsCount}
                </span>
              </div>
            </div>

            {/* Body: Linked Mentions View */}
            <div className="flex-1 overflow-hidden relative">
              <LinkedMentionsView
                currentNote={selectedNote}
                allNotes={allNotes || notes}
                backlinks={backlinks ?? null}
                onSelectNote={onSelectNote}
              />
            </div>

            {/* Collapsed Bar: Recent History */}
            <div
              onClick={() => setUpperTab('history')}
              className="px-3.5 py-2 border-t border-[#eeeeee] flex items-center justify-between shrink-0 bg-[#f9f9fb] hover:bg-[#f0f0f3] cursor-pointer transition-colors z-20 select-none group"
              title="Click to open Recent History"
            >
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#777777] group-hover:text-black font-medium flex items-center gap-1.5 transition-colors">
                <ChevronRight className="w-3.5 h-3.5 text-[#999999] group-hover:text-black transition-colors" />
                <History className="w-3.5 h-3.5 text-[#999999] group-hover:text-black transition-colors" />
                <span>Recent History</span>
              </span>
              <span className="font-mono text-[9px] text-[#777777] group-hover:text-black bg-black/5 group-hover:bg-black/10 px-1.5 py-0.2 rounded-full font-medium transition-colors">
                {historyNotes.length}
              </span>
            </div>
          </>
        ) : (
          <>
            {/* Collapsed Bar: Linked Mentions */}
            <div
              onClick={() => setUpperTab('mentions')}
              className="px-3.5 py-2 border-b border-[#eeeeee] flex items-center justify-between shrink-0 bg-[#f9f9fb] hover:bg-[#f0f0f3] cursor-pointer transition-colors z-20 select-none group"
              title="Click to open Linked Mentions"
            >
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#777777] group-hover:text-black font-medium flex items-center gap-1.5 transition-colors">
                <ChevronRight className="w-3.5 h-3.5 text-[#999999] group-hover:text-black transition-colors" />
                <Link2 className="w-3.5 h-3.5 text-[#999999] group-hover:text-black transition-colors" />
                <span>Linked Mentions</span>
              </span>
              <span className="font-mono text-[9px] text-[#777777] group-hover:text-black bg-black/5 group-hover:bg-black/10 px-1.5 py-0.2 rounded-full font-medium transition-colors">
                {mentionsCount}
              </span>
            </div>

            {/* Header: Recent History (Expanded) */}
            <div
              onClick={() => setUpperTab('mentions')}
              className="px-3.5 py-2 border-b border-[#eeeeee] flex items-center justify-between shrink-0 bg-white z-20 cursor-pointer hover:bg-[#fafafa] transition-colors select-none"
              title="Click to toggle Linked Mentions"
            >
              <span className="font-mono text-[10px] uppercase tracking-wider text-black font-bold flex items-center gap-1.5">
                <ChevronDown className="w-3.5 h-3.5 text-black" />
                <History className="w-3.5 h-3.5 text-black" />
                <span>Recent History</span>
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[9px] text-white bg-black px-1.5 py-0.2 rounded-full font-semibold">
                  {historyNotes.length}
                </span>
              </div>
            </div>

            {/* Body: Recent History View */}
            <div className="flex-1 overflow-hidden relative">
              <HistoryLensStream
                historyNotes={historyNotes}
                selectedNote={selectedNote}
                onSelectNote={onSelectNote}
                hideHeader={true}
              />
            </div>
          </>
        )}
      </div>

      {/* (3) Middle Section: Dynamic Hierarchical Filter Bar (Compact & Slim) */}
      {onSelectCategory && (
        <div className="border-b border-[#e8e8e8] bg-white flex flex-col shrink-0 py-1 shadow-2xs">
          {/* Filter Header Row */}
          <div className="px-3 pb-0.5 flex items-center justify-between text-[9px] font-mono uppercase text-[#888888]">
            <span className="font-bold flex items-center gap-1 text-black">
              <span>Filter Stream</span>
              {(selectedCategory || selectedTopic || selectedSubCategory) && (
                <span className="text-[#888888] font-normal normal-case">
                  ({selectedTopic ? (selectedTopic.startsWith('#') ? selectedTopic : `#${selectedTopic}`) : (selectedSubCategory || selectedCategory)})
                </span>
              )}
            </span>
            {hasActiveFilter && onResetFilters && (
              <button
                onClick={onResetFilters}
                className="flex items-center gap-0.5 text-[9px] text-[#888888] hover:text-black transition-colors cursor-pointer"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Active Tag Chip Row (if selectedTopic is active) */}
          {selectedTopic && onSelectTopic && (
            <div className="flex items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-3 py-1 gap-1.5 bg-[#fcfcfd] border-b border-[#f0f0f0]">
              <span className="text-[9px] font-mono text-[#999999] uppercase shrink-0">
                ACTIVE TAG:
              </span>
              <button
                onClick={() => onSelectTopic(null)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-black text-white font-medium shrink-0 hover:bg-[#333333] transition-colors cursor-pointer select-none"
                title="Click to remove tag filter"
              >
                <span>{selectedTopic.startsWith('#') ? selectedTopic : `#${selectedTopic}`}</span>
                <span className="text-[10px] text-white/70 hover:text-white ml-0.5">✕</span>
              </button>
            </div>
          )}

          {/* Level 1: Categories */}
          <div className="flex items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-3 py-0.5 gap-1">
            <button
              onClick={() => {
                onSelectCategory(null);
                if (onSelectSubCategory) onSelectSubCategory(null);
                if (onSelectTopic) onSelectTopic(null);
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors shrink-0 ${
                !selectedCategory
                  ? 'bg-black text-white font-semibold'
                  : 'bg-[#f4f4f5] text-[#555555] hover:bg-[#eaeaea]'
              }`}
            >
              All
            </button>
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    if (isSelected) {
                      onSelectCategory(null);
                      if (onSelectSubCategory) onSelectSubCategory(null);
                      if (onSelectTopic) onSelectTopic(null);
                    } else {
                      onSelectCategory(cat);
                      if (onSelectSubCategory) onSelectSubCategory(null);
                      if (onSelectTopic) onSelectTopic(null);
                    }
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors shrink-0 ${
                    isSelected
                      ? 'bg-black text-white font-semibold shadow-xs'
                      : 'bg-[#f4f4f5] text-[#333333] hover:bg-[#eaeaea]'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Level 2: Sub-Categories (if Category is selected) */}
          {selectedCategory && subCategories.length > 0 && onSelectSubCategory && (
            <div className="flex items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-3 pt-0.5 gap-1 border-t border-[#f0f0f0] mt-0.5">
              <span className="text-[9px] font-mono text-[#999999] uppercase shrink-0">
                SUB:
              </span>
              <button
                onClick={() => {
                  onSelectSubCategory(null);
                  if (onSelectTopic) onSelectTopic(null);
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors shrink-0 ${
                  !selectedSubCategory
                    ? 'bg-black text-white font-semibold'
                    : 'bg-white border border-[#e5e5e5] text-[#555555] hover:bg-[#f5f5f5]'
                }`}
              >
                All
              </button>
              {subCategories.map((sub) => {
                const isSelected = selectedSubCategory === sub;
                return (
                  <button
                    key={sub}
                    onClick={() => {
                      if (isSelected) {
                        onSelectSubCategory(null);
                        if (onSelectTopic) onSelectTopic(null);
                      } else {
                        onSelectSubCategory(sub);
                        if (onSelectTopic) onSelectTopic(null);
                      }
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors shrink-0 ${
                      isSelected
                        ? 'bg-black text-white font-semibold shadow-xs'
                        : 'bg-white border border-[#e5e5e5] text-[#333333] hover:bg-[#f5f5f5]'
                    }`}
                  >
                    {sub}
                  </button>
                );
              })}
            </div>
          )}

          {/* Level 3: Topics (if Sub-Category is selected) */}
          {selectedSubCategory && topics.length > 0 && onSelectTopic && (
            <div className="flex items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-3 pt-0.5 gap-1 border-t border-[#f0f0f0] mt-0.5">
              <span className="text-[9px] font-mono text-[#999999] uppercase shrink-0">
                TOPIC:
              </span>
              <button
                onClick={() => onSelectTopic(null)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors shrink-0 ${
                  !selectedTopic
                    ? 'bg-black text-white font-semibold'
                    : 'bg-white border border-[#e5e5e5] text-[#555555] hover:bg-[#f5f5f5]'
                }`}
              >
                All
              </button>
              {topics.map((top) => {
                const isSelected = selectedTopic === top;
                return (
                  <button
                    key={top}
                    onClick={() => {
                      if (isSelected) {
                        onSelectTopic(null);
                      } else {
                        onSelectTopic(top);
                      }
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors shrink-0 ${
                      isSelected
                        ? 'bg-black text-white font-semibold shadow-xs'
                        : 'bg-white border border-[#e5e5e5] text-[#333333] hover:bg-[#f5f5f5]'
                    }`}
                  >
                    {top}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* (4) Lower Section: Spacious Archive Scroll Stream (Maintains Full Height!) */}
      <div className="flex-1 min-h-[300px] relative overflow-hidden flex flex-col">
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
