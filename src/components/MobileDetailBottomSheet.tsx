import React from 'react';
import type { NoteItem, TaxonomyData } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { History, SlidersHorizontal, X, RotateCcw } from 'lucide-react';
import { HistoryLensStream } from './HistoryLensStream';
import { ScrollLensStream } from './ScrollLensStream';

interface MobileDetailBottomSheetProps {
  isOpen: boolean;
  activeTab: 'history' | 'filter';
  onChangeTab: (tab: 'history' | 'filter') => void;
  onClose: () => void;
  historyNotes: NoteItem[];
  selectedNote: NoteItem | null;
  notes: NoteItem[];
  taxonomy: TaxonomyData;
  selectedCategory: string | null;
  selectedSubCategory: string | null;
  selectedTopic: string | null;
  onSelectNote: (note: NoteItem) => void;
  onSelectCategory: (cat: string | null) => void;
  onSelectSubCategory: (subCat: string | null) => void;
  onSelectTopic: (topic: string | null) => void;
  onResetFilters: () => void;
}

export const MobileDetailBottomSheet: React.FC<MobileDetailBottomSheetProps> = ({
  isOpen,
  activeTab,
  onChangeTab,
  onClose,
  historyNotes,
  selectedNote,
  notes,
  taxonomy,
  selectedCategory,
  selectedSubCategory,
  selectedTopic,
  onSelectNote,
  onSelectCategory,
  onSelectSubCategory,
  onSelectTopic,
  onResetFilters,
}) => {
  if (!isOpen) return null;

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

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end">
        {/* Backdrop Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-xs"
        />

        {/* Bottom Sheet Modal */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative w-full max-h-[78vh] h-[520px] bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden z-10"
        >
          {/* Top Drag Handle Bar */}
          <div className="w-full pt-3 pb-1 flex justify-center cursor-pointer" onClick={onClose}>
            <div className="w-10 h-1 bg-[#d5d5d8] rounded-full" />
          </div>

          {/* Tab Switcher Header */}
          <div className="px-4 py-2 border-b border-[#eeeeee] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1 bg-[#f4f4f5] p-1 rounded-xl font-mono text-xs">
              <button
                onClick={() => onChangeTab('history')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                  activeTab === 'history'
                    ? 'bg-black text-white font-semibold shadow-xs'
                    : 'text-[#666666] hover:text-black'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>History</span>
                <span className={`text-[10px] ${activeTab === 'history' ? 'text-white/70' : 'text-[#888888]'}`}>
                  ({historyNotes.length})
                </span>
              </button>

              <button
                onClick={() => onChangeTab('filter')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                  activeTab === 'filter'
                    ? 'bg-black text-white font-semibold shadow-xs'
                    : 'text-[#666666] hover:text-black'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filter & Stream</span>
                <span className={`text-[10px] ${activeTab === 'filter' ? 'text-white/70' : 'text-[#888888]'}`}>
                  ({notes.length})
                </span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-[#f0f0f0] text-[#666666] transition-colors"
              aria-label="Close sheet"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab Body */}
          <div className="flex-1 relative overflow-hidden flex flex-col">
            {activeTab === 'history' ? (
              // Tab 1: Recent History Lens Stream
              <div className="flex-1 relative overflow-hidden flex flex-col">
                <HistoryLensStream
                  historyNotes={historyNotes}
                  selectedNote={selectedNote}
                  onSelectNote={(n) => {
                    onSelectNote(n);
                    onClose();
                  }}
                />
              </div>
            ) : (
              // Tab 2: Filter & Archive Stream
              <div className="flex-1 relative overflow-hidden flex flex-col">
                {/* Compact Filter Buttons Bar */}
                <div className="border-b border-[#eeeeee] bg-white flex flex-col shrink-0 py-2 px-3 shadow-2xs">
                  {/* Category Row */}
                  <div className="flex items-center justify-between pb-1 text-[10px] font-mono text-[#888888]">
                    <span className="font-bold text-black uppercase">Filter by Category</span>
                    {hasActiveFilter && (
                      <button
                        onClick={onResetFilters}
                        className="flex items-center gap-1 text-[10px] text-[#888888] hover:text-black"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        <span>Reset</span>
                      </button>
                    )}
                  </div>

                  {/* Level 1: Categories */}
                  <div className="flex items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden gap-1.5 py-0.5">
                    <button
                      onClick={() => {
                        onSelectCategory(null);
                        onSelectSubCategory(null);
                        onSelectTopic(null);
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-mono shrink-0 transition-colors ${
                        !selectedCategory
                          ? 'bg-black text-white font-semibold'
                          : 'bg-[#f4f4f5] text-[#555555] hover:bg-[#eaeaea]'
                      }`}
                    >
                      All
                    </button>
                    {categories.map((cat) => {
                      const isSelected = selectedCategory === cat;
                      const count = taxonomy[cat]?.count || 0;
                      return (
                        <button
                          key={cat}
                          onClick={() => {
                            if (isSelected) {
                              onSelectCategory(null);
                              onSelectSubCategory(null);
                              onSelectTopic(null);
                            } else {
                              onSelectCategory(cat);
                              onSelectSubCategory(null);
                              onSelectTopic(null);
                            }
                          }}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-mono shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-black text-white font-semibold shadow-xs'
                              : 'bg-[#f4f4f5] text-[#333333] hover:bg-[#eaeaea]'
                          }`}
                        >
                          <span>{cat}</span>
                          <span className={`text-[9px] ml-1 ${isSelected ? 'text-white/70' : 'text-[#888888]'}`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Level 2: Sub-Categories */}
                  {selectedCategory && subCategories.length > 0 && (
                    <div className="flex items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden gap-1.5 pt-1.5 border-t border-[#f0f0f0] mt-1">
                      <span className="text-[9px] font-mono text-[#999999] uppercase shrink-0">SUB:</span>
                      <button
                        onClick={() => {
                          onSelectSubCategory(null);
                          onSelectTopic(null);
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono shrink-0 transition-colors ${
                          !selectedSubCategory
                            ? 'bg-black text-white font-semibold'
                            : 'bg-white border border-[#e5e5e5] text-[#555555]'
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
                                onSelectTopic(null);
                              } else {
                                onSelectSubCategory(sub);
                                onSelectTopic(null);
                              }
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono shrink-0 transition-colors ${
                              isSelected
                                ? 'bg-black text-white font-semibold shadow-xs'
                                : 'bg-white border border-[#e5e5e5] text-[#333333]'
                            }`}
                          >
                            {sub}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Level 3: Topics */}
                  {selectedSubCategory && topics.length > 0 && (
                    <div className="flex items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden gap-1.5 pt-1.5 border-t border-[#f0f0f0] mt-1">
                      <span className="text-[9px] font-mono text-[#999999] uppercase shrink-0">TOPIC:</span>
                      <button
                        onClick={() => onSelectTopic(null)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono shrink-0 transition-colors ${
                          !selectedTopic
                            ? 'bg-black text-white font-semibold'
                            : 'bg-white border border-[#e5e5e5] text-[#555555]'
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
                            className={`px-2 py-0.5 rounded text-[10px] font-mono shrink-0 transition-colors ${
                              isSelected
                                ? 'bg-black text-white font-semibold shadow-xs'
                                : 'bg-white border border-[#e5e5e5] text-[#333333]'
                            }`}
                          >
                            {top}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Lower Archive Stream */}
                <div className="flex-1 relative overflow-hidden flex flex-col items-center justify-center w-full">
                  <ScrollLensStream
                    notes={notes}
                    selectedNote={selectedNote}
                    onSelectNote={(n) => {
                      onSelectNote(n);
                      onClose();
                    }}
                    isCompact={true}
                  />
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
