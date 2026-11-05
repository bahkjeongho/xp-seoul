import React from 'react';
import type { NoteItem, TaxonomyData } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { History, SlidersHorizontal, X, RotateCcw } from 'lucide-react';
import { HistoryLensStream } from './HistoryLensStream';

interface MobileDetailBottomSheetProps {
  isOpen: boolean;
  activeTab: 'history' | 'filter';
  onChangeTab?: (tab: 'history' | 'filter') => void;
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
          className="absolute inset-0 bg-black/40 backdrop-blur-xs"
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

          {/* Clean Dedicated Header depending on Active Tab */}
          <div className="px-5 py-2.5 border-b border-[#eeeeee] flex items-center justify-between shrink-0 font-sans">
            {activeTab === 'history' ? (
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-black" />
                <span className="font-bold text-sm text-black">Recent History</span>
                <span className="text-xs font-mono text-[#888888]">({historyNotes.length})</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-black" />
                <span className="font-bold text-sm text-black">Filter Archive</span>
                <span className="text-xs font-mono text-[#888888]">({notes.length} notes)</span>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-black/5 hover:bg-black/10 active:scale-95 flex items-center justify-center text-black transition-all"
              aria-label="Close sheet"
            >
              <X className="w-3.5 h-3.5 stroke-[2.2]" />
            </button>
          </div>

          {/* Dedicated View Body */}
          <div className="flex-1 relative overflow-hidden flex flex-col">
            {activeTab === 'history' ? (
              // Dedicated View 1: History Only
              <div className="flex-1 relative overflow-hidden flex flex-col">
                <HistoryLensStream
                  historyNotes={historyNotes}
                  selectedNote={selectedNote}
                  mode="center"
                  onSelectNote={(n) => {
                    onSelectNote(n);
                    onClose();
                  }}
                />
              </div>
            ) : (
              // Dedicated View 2: Pure Filter Selector (No duplicate nested stream!)
              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 font-sans pb-8">
                {/* 1. All Notes Option */}
                <div>
                  <button
                    onClick={() => {
                      onSelectCategory(null);
                      onSelectSubCategory(null);
                      onSelectTopic(null);
                    }}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-medium transition-all text-left flex items-center justify-between border ${
                      !selectedCategory
                        ? 'bg-black text-white border-black font-semibold shadow-xs'
                        : 'bg-[#f8f8f9] text-[#333333] border-black/8 hover:bg-[#f0f0f2]'
                    }`}
                  >
                    <span>All Notes</span>
                    <span className="text-[11px] font-mono opacity-80">{notes.length.toLocaleString()}</span>
                  </button>
                </div>

                {/* 2. Categories Section */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#777777] font-semibold">
                      Category
                    </span>
                    {hasActiveFilter && (
                      <button
                        onClick={onResetFilters}
                        className="flex items-center gap-1 text-[11px] text-[#888888] hover:text-black transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
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
                          className={`py-2 px-3 rounded-xl text-xs font-medium transition-all text-left flex items-center justify-between border ${
                            isSelected
                              ? 'bg-black text-white border-black font-semibold shadow-xs'
                              : 'bg-white text-[#333333] border-black/8 hover:bg-[#f8f8f9]'
                          }`}
                        >
                          <span className="truncate">{cat}</span>
                          <span className={`text-[10px] font-mono ml-1 ${isSelected ? 'text-white/80' : 'text-[#888888]'}`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Sub-Categories Section (if category selected) */}
                {selectedCategory && subCategories.length > 0 && (
                  <div className="flex flex-col gap-2 pt-2 border-t border-[#f0f0f0]">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-[#777777] font-semibold">
                        Subcategory ({selectedCategory})
                      </span>
                      {selectedSubCategory && (
                        <button
                          onClick={() => {
                            onSelectSubCategory(null);
                            onSelectTopic(null);
                          }}
                          className="text-[11px] font-mono text-[#888888] hover:text-black"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {subCategories.map((sub) => {
                        const isSelected = selectedSubCategory === sub;
                        const count = currentCategoryData?.subCategories[sub]?.count || 0;
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
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border ${
                              isSelected
                                ? 'bg-black text-white border-black font-semibold shadow-xs'
                                : 'bg-[#f8f8f9] text-[#333333] border-black/8 hover:bg-[#f0f0f2]'
                            }`}
                          >
                            <span>{sub}</span>
                            <span className={`text-[10px] font-mono ${isSelected ? 'text-white/80' : 'text-[#888888]'}`}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 4. Topics Section (if subcategory selected) */}
                {selectedSubCategory && topics.length > 0 && (
                  <div className="flex flex-col gap-2 pt-2 border-t border-[#f0f0f0]">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-[#777777] font-semibold">
                        Topics ({selectedSubCategory})
                      </span>
                      {selectedTopic && (
                        <button
                          onClick={() => onSelectTopic(null)}
                          className="text-[11px] font-mono text-[#888888] hover:text-black"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
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
                            className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-all border ${
                              isSelected
                                ? 'bg-black text-white border-black font-semibold shadow-xs'
                                : 'bg-white text-[#444444] border-black/8 hover:bg-[#f8f8f9]'
                            }`}
                          >
                            <span>• {top}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 5. Sticky Done Button */}
                <div className="mt-2 pt-3 border-t border-[#eeeeee]">
                  <button
                    onClick={onClose}
                    className="w-full py-3 rounded-full bg-black text-white font-sans text-xs font-semibold shadow-md active:scale-[0.99] transition-transform"
                  >
                    View Notes ({notes.length.toLocaleString()})
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
