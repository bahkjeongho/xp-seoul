import React, { useState } from 'react';
import type { TaxonomyData } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, RotateCcw, ChevronRight } from 'lucide-react';

interface TopFilterBarProps {
  taxonomy: TaxonomyData;
  totalNotesCount: number;
  filteredNotesCount: number;
  selectedCategory: string | null;
  selectedSubCategory: string | null;
  selectedTopic: string | null;
  searchQuery: string;
  onSelectCategory: (cat: string | null) => void;
  onSelectSubCategory: (subCat: string | null) => void;
  onSelectTopic: (topic: string | null) => void;
  onSearchChange: (q: string) => void;
  onReset: () => void;
  isDesktop?: boolean;
}

export const TopFilterBar: React.FC<TopFilterBarProps> = ({
  taxonomy,
  totalNotesCount,
  filteredNotesCount,
  selectedCategory,
  selectedSubCategory,
  selectedTopic,
  searchQuery,
  onSelectCategory,
  onSelectSubCategory,
  onSelectTopic,
  onSearchChange,
  onReset,
  isDesktop = false,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(Boolean(searchQuery));

  // Category List sorted by note count
  const categories = Object.keys(taxonomy).sort((a, b) => {
    return (taxonomy[b]?.count || 0) - (taxonomy[a]?.count || 0);
  });

  // Current category data
  const currentCategoryData = selectedCategory ? taxonomy[selectedCategory] : null;
  const subCategories = currentCategoryData
    ? Object.keys(currentCategoryData.subCategories || {}).sort(
        (a, b) => currentCategoryData.subCategories[b].count - currentCategoryData.subCategories[a].count
      )
    : [];

  // Current sub-category data
  const currentSubCategoryData =
    selectedCategory && selectedSubCategory && currentCategoryData?.subCategories[selectedSubCategory]
      ? currentCategoryData.subCategories[selectedSubCategory]
      : null;
  const topics = currentSubCategoryData
    ? Object.keys(currentSubCategoryData.topics || {}).sort(
        (a, b) => currentSubCategoryData.topics[b] - currentSubCategoryData.topics[a]
      )
    : [];

  const hasActiveFilter = Boolean(selectedCategory || selectedSubCategory || selectedTopic || searchQuery);

  return (
    <div className="w-full flex flex-col bg-white border-b border-[#eeeeee] shrink-0 select-none z-30 transition-all">
      {/* Search Input Row (Mobile or when toggled in desktop) */}
      <AnimatePresence>
        {(isSearchOpen || (!isDesktop && searchQuery)) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-[#f0f0f0] px-4 lg:px-8 py-2 bg-[#fcfcfd]"
          >
            <div className="flex items-center gap-2 bg-[#f5f5f7] px-3.5 py-1.5 rounded-lg border border-[#e8e8ea] max-w-xl">
              <Search className="w-3.5 h-3.5 text-[#888888] shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search by note title, alias, topic, city..."
                className="w-full bg-transparent text-xs font-mono text-black placeholder-[#999999] outline-none"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="p-0.5 rounded-full hover:bg-black/10 text-[#888888]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Level 1: Category Buttons Row */}
      <div className="flex items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-4 lg:px-8 py-2.5 gap-2">
        {/* Search Toggle Button */}
        <button
          onClick={() => setIsSearchOpen((prev) => !prev)}
          className={`p-1.5 rounded-md border text-xs font-mono transition-colors shrink-0 flex items-center justify-center ${
            isSearchOpen || searchQuery
              ? 'bg-black text-white border-black'
              : 'bg-[#f6f6f7] text-[#666666] border-[#eeeeee] hover:bg-[#eaeaea]'
          }`}
          title="Search Vault"
          aria-label="Toggle search"
        >
          <Search className="w-3.5 h-3.5" />
        </button>

        {/* All / Reset Button */}
        <button
          onClick={() => {
            onSelectCategory(null);
            onSelectSubCategory(null);
            onSelectTopic(null);
          }}
          className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors shrink-0 ${
            !selectedCategory
              ? 'bg-black text-white font-semibold shadow-xs'
              : 'bg-[#f4f4f5] text-[#555555] hover:bg-[#eaeaea]'
          }`}
        >
          All
          <span className="text-[10px] opacity-60 ml-1.5 font-sans">
            {totalNotesCount}
          </span>
        </button>

        {/* Category Pills */}
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
              className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all shrink-0 ${
                isSelected
                  ? 'bg-black text-white font-semibold shadow-xs'
                  : 'bg-[#f4f4f5] text-[#333333] hover:bg-[#eaeaea]'
              }`}
            >
              <span>{cat}</span>
              <span className={`text-[10px] ml-1.5 font-sans ${isSelected ? 'text-white/70' : 'text-[#888888]'}`}>
                {count}
              </span>
            </button>
          );
        })}

        {/* Reset Button if any filter active */}
        {hasActiveFilter && (
          <button
            onClick={onReset}
            className="px-2.5 py-1.5 rounded-md text-xs font-mono text-[#888888] hover:text-black hover:bg-[#eeeeee] transition-colors shrink-0 flex items-center gap-1.5 border border-dashed border-[#cccccc] ml-auto"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {/* Level 2: Sub-Category Buttons Row (Appears when Category selected) */}
      <AnimatePresence>
        {selectedCategory && subCategories.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="overflow-hidden border-t border-[#f0f0f0] bg-[#fafafa]"
          >
            <div className="flex items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-4 lg:px-8 py-2 gap-2">
              <span className="text-[10px] font-mono text-[#999999] uppercase tracking-wider shrink-0 flex items-center gap-1">
                <span>SUB</span>
                <ChevronRight className="w-2.5 h-2.5" />
              </span>

              {/* Sub-Category 'All' Pill */}
              <button
                onClick={() => {
                  onSelectSubCategory(null);
                  onSelectTopic(null);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors shrink-0 ${
                  !selectedSubCategory
                    ? 'bg-black text-white font-semibold shadow-xs'
                    : 'bg-white border border-[#e5e5e5] text-[#555555] hover:bg-[#f0f0f0]'
                }`}
              >
                All {selectedCategory}
              </button>

              {/* Sub-Category Pills */}
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
                    className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all shrink-0 ${
                      isSelected
                        ? 'bg-black text-white font-semibold shadow-xs'
                        : 'bg-white border border-[#e5e5e5] text-[#333333] hover:bg-[#f5f5f5]'
                    }`}
                  >
                    <span>{sub}</span>
                    <span className={`text-[10px] ml-1.5 font-sans ${isSelected ? 'text-white/70' : 'text-[#888888]'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Level 3: Topic Buttons Row (Appears when Sub-Category selected) */}
      <AnimatePresence>
        {selectedSubCategory && topics.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="overflow-hidden border-t border-[#eeeeee] bg-[#f5f5f7]"
          >
            <div className="flex items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-4 lg:px-8 py-2 gap-2">
              <span className="text-[10px] font-mono text-[#999999] uppercase tracking-wider shrink-0 flex items-center gap-1">
                <span>TOPIC</span>
                <ChevronRight className="w-2.5 h-2.5" />
              </span>

              {/* Topic 'All' Pill */}
              <button
                onClick={() => onSelectTopic(null)}
                className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors shrink-0 ${
                  !selectedTopic
                    ? 'bg-black text-white font-semibold shadow-xs'
                    : 'bg-white border border-[#e5e5e5] text-[#555555] hover:bg-[#f0f0f0]'
                }`}
              >
                All {selectedSubCategory}
              </button>

              {/* Topic Pills */}
              {topics.map((topic) => {
                const isSelected = selectedTopic === topic;
                const count = currentSubCategoryData?.topics[topic] || 0;
                return (
                  <button
                    key={topic}
                    onClick={() => {
                      if (isSelected) {
                        onSelectTopic(null);
                      } else {
                        onSelectTopic(topic);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all shrink-0 ${
                      isSelected
                        ? 'bg-black text-white font-semibold shadow-xs'
                        : 'bg-white border border-[#e5e5e5] text-[#333333] hover:bg-[#f5f5f5]'
                    }`}
                  >
                    <span>{topic}</span>
                    <span className={`text-[10px] ml-1.5 font-sans ${isSelected ? 'text-white/70' : 'text-[#888888]'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
