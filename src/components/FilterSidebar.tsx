import React, { useState } from 'react';
import type { TaxonomyData } from '../types';
import { ArrowLeft, Search, RotateCcw, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FilterSidebarProps {
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
  isCompact?: boolean;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
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
  isCompact = false,
}) => {
  // Navigation view level: 'root' (Categories) | 'subCategory' | 'topics'
  const currentViewLevel = selectedSubCategory
    ? 'topics'
    : selectedCategory
    ? 'subCategory'
    : 'root';

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

  const hasActiveFilters = Boolean(selectedCategory || selectedSubCategory || selectedTopic || searchQuery);

  return (
    <aside
      className={`h-full flex flex-col justify-between py-8 px-6 transition-all duration-500 bg-white select-none ${
        isCompact ? 'w-[220px]' : 'w-[280px] lg:w-[320px]'
      }`}
    >
      <div className="flex flex-col gap-6 overflow-hidden">
        {/* Brand Wordmark (Figma XP Seoul) */}
        <div className="flex flex-col gap-1">
          <button
            onClick={onReset}
            className="text-left font-black tracking-[-0.05em] text-2xl lg:text-3xl text-black hover:opacity-70 transition-opacity font-sans"
          >
            XP Seoul
          </button>
          <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase text-[#999999] tracking-wider">
            <span>Archive</span>
            <span>·</span>
            <span className="text-black font-semibold">
              {filteredNotesCount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Minimal Search Field */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#aaaaaa]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search keywords..."
            className="w-full bg-[#f6f6f7] pl-8 pr-3 py-1.5 rounded-lg text-xs font-sans text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-1 focus:ring-black transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#888888] hover:text-black"
            >
              ×
            </button>
          )}
        </div>

        {/* Organic Filter Navigation (Figma frame 1:464 inspired) */}
        <div className="flex flex-col gap-3">
          {/* Header & Breadcrumb / Back button */}
          <div className="flex items-center justify-between min-h-[24px]">
            {currentViewLevel === 'root' ? (
              <span className="font-mono text-[11px] uppercase tracking-widest text-[#888888] font-bold">
                Filter
              </span>
            ) : currentViewLevel === 'subCategory' ? (
              <button
                onClick={() => {
                  onSelectCategory(null);
                  onSelectSubCategory(null);
                  onSelectTopic(null);
                }}
                className="flex items-center gap-1 text-xs font-mono text-black hover:underline"
              >
                <ArrowLeft className="w-3 h-3" />
                <span className="truncate max-w-[140px] font-semibold">{selectedCategory}</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  onSelectSubCategory(null);
                  onSelectTopic(null);
                }}
                className="flex items-center gap-1 text-xs font-mono text-black hover:underline"
              >
                <ArrowLeft className="w-3 h-3" />
                <span className="truncate max-w-[140px] font-semibold">{selectedSubCategory}</span>
              </button>
            )}

            {hasActiveFilters && (
              <button
                onClick={onReset}
                className="font-mono text-[10px] text-[#888888] hover:text-black flex items-center gap-1"
                title="Reset all filters"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>All</span>
              </button>
            )}
          </div>

          {/* Organic Button List (Transitions smoothly between levels) */}
          <div className="overflow-y-auto max-h-[calc(100vh-280px)] pr-1 flex flex-col gap-1.5">
            <AnimatePresence mode="wait">
              {/* LEVEL 1: Root Categories */}
              {currentViewLevel === 'root' && (
                <motion.div
                  key="level-categories"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-1"
                >
                  {categories.map((catName) => {
                    const count = taxonomy[catName].count;
                    return (
                      <button
                        key={catName}
                        onClick={() => {
                          onSelectCategory(catName);
                          onSelectSubCategory(null);
                          onSelectTopic(null);
                        }}
                        className="group flex items-center justify-between text-left py-2 px-2.5 rounded-lg hover:bg-[#f5f5f7] transition-all"
                      >
                        <span className="text-sm font-sans font-medium text-[#222222] group-hover:text-black group-hover:translate-x-0.5 transition-transform">
                          {catName}
                        </span>
                        <span className="font-mono text-[10px] text-[#999999] group-hover:text-black">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </motion.div>
              )}

              {/* LEVEL 2: Sub-Categories */}
              {currentViewLevel === 'subCategory' && (
                <motion.div
                  key="level-subcategories"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-1"
                >
                  <div className="px-2.5 py-1 text-[10px] font-mono uppercase text-[#aaaaaa] tracking-wider">
                    Select Sub-Category
                  </div>
                  {subCategories.map((subCatName) => {
                    const count = currentCategoryData?.subCategories[subCatName]?.count || 0;
                    return (
                      <button
                        key={subCatName}
                        onClick={() => {
                          onSelectSubCategory(subCatName);
                          onSelectTopic(null);
                        }}
                        className="group flex items-center justify-between text-left py-2 px-2.5 rounded-lg hover:bg-[#f5f5f7] transition-all"
                      >
                        <span className="text-sm font-sans font-medium text-[#222222] group-hover:text-black group-hover:translate-x-0.5 transition-transform">
                          {subCatName}
                        </span>
                        <span className="font-mono text-[10px] text-[#999999] group-hover:text-black">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </motion.div>
              )}

              {/* LEVEL 3: Topics */}
              {currentViewLevel === 'topics' && (
                <motion.div
                  key="level-topics"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-1"
                >
                  <div className="px-2.5 py-1 text-[10px] font-mono uppercase text-[#aaaaaa] tracking-wider">
                    Select Topic
                  </div>
                  {topics.map((topicName) => {
                    const count = currentSubCategoryData?.topics[topicName] || 0;
                    const isSelected = selectedTopic === topicName;
                    return (
                      <button
                        key={topicName}
                        onClick={() => {
                          onSelectTopic(isSelected ? null : topicName);
                        }}
                        className={`group flex items-center justify-between text-left py-2 px-2.5 rounded-lg transition-all ${
                          isSelected
                            ? 'bg-black text-white'
                            : 'hover:bg-[#f5f5f7] text-[#222222]'
                        }`}
                      >
                        <span
                          className={`text-sm font-sans ${
                            isSelected ? 'font-semibold text-white' : 'font-normal group-hover:text-black'
                          }`}
                        >
                          {topicName}
                        </span>
                        <span
                          className={`font-mono text-[10px] ${
                            isSelected ? 'text-white/70' : 'text-[#999999]'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Footer Meta */}
      <div className="pt-4 border-t border-[#eeeeee] flex items-center justify-between text-[10px] font-mono text-[#999999]">
        <span>XP-SEOUL</span>
        <span>2026</span>
      </div>
    </aside>
  );
};
