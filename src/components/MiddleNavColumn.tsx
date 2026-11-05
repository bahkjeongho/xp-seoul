import React from 'react';
import type { NoteItem, TaxonomyData } from '../types';
import { ScrollLensStream } from './ScrollLensStream';
import { HistoryLensStream } from './HistoryLensStream';
import { RotateCcw, ChevronRight } from 'lucide-react';

interface MiddleNavColumnProps {
  notes: NoteItem[];
  selectedNote: NoteItem | null;
  historyNotes: NoteItem[];
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
  selectedNote,
  historyNotes,
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

  // When note is selected: Unified Navigation Column
  return (
    <div className="w-[280px] lg:w-[320px] h-full flex flex-col bg-[#fbfbfb] border-r border-[#e8e8e8] shrink-0 select-none overflow-hidden">
      {/* (1) Top Brand Header with Home Navigation */}
      <div className="px-4 py-2.5 border-b border-[#eeeeee] flex items-center justify-between bg-white shrink-0">
        <button
          onClick={onGoHome}
          title="Return to Main Overview (ESC)"
          className="flex items-center gap-2 group text-left"
        >
          <span className="font-black text-lg tracking-tight text-black font-sans group-hover:opacity-70 transition-opacity">
            XP Seoul
          </span>
          <span className="font-mono text-[9px] text-[#888888] px-1.5 py-0.5 rounded bg-[#f4f4f5] group-hover:bg-black group-hover:text-white transition-colors">
            ESC
          </span>
        </button>

        <span className="font-mono text-[9px] text-[#888888]">
          {notes.length} notes
        </span>
      </div>

      {/* (2) Upper Section: Recent History Lens Stream (Compact ~34% height) */}
      <div className="h-[34%] min-h-[190px] border-b border-[#e8e8e8] relative flex flex-col bg-[#fcfcfd] overflow-hidden">
        <HistoryLensStream
          historyNotes={historyNotes}
          selectedNote={selectedNote}
          onSelectNote={onSelectNote}
        />
      </div>

      {/* (3) Middle Section: Dynamic Filter Bar between History & Stream (Utilizing the Gap!) */}
      {onSelectCategory && (
        <div className="border-b border-[#e8e8e8] bg-white flex flex-col shrink-0 py-1.5 shadow-2xs">
          {/* Filter Header Row */}
          <div className="px-3.5 pb-1 flex items-center justify-between text-[9px] font-mono uppercase text-[#888888]">
            <span className="font-bold flex items-center gap-1 text-black">
              <span>Filter Stream</span>
              {selectedCategory && (
                <span className="text-[#888888] font-normal normal-case">
                  ({selectedTopic || selectedSubCategory || selectedCategory})
                </span>
              )}
            </span>
            {hasActiveFilter && onResetFilters && (
              <button
                onClick={onResetFilters}
                className="flex items-center gap-0.5 text-[9px] text-[#888888] hover:text-black transition-colors"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Level 1: Categories */}
          <div className="flex items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-3 py-1 gap-1">
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
            <div className="flex items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-3 pt-1 gap-1 border-t border-[#f0f0f0] mt-0.5">
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
            <div className="flex items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-3 pt-1 gap-1 border-t border-[#f0f0f0] mt-0.5">
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

      {/* (4) Lower Section: Compact Archive Scroll Stream */}
      <div className="flex-1 min-h-[220px] relative overflow-hidden flex flex-col">
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
