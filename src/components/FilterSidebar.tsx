import React, { useState } from 'react';
import type { TaxonomyData } from '../types';
import { ChevronRight, ChevronDown, RotateCcw, Search, Sparkles } from 'lucide-react';

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
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'The Arts': true,
    'Design': true,
  });

  const [expandedSubCategories, setExpandedSubCategories] = useState<Record<string, boolean>>({});

  const toggleCategoryExpand = (cat: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const toggleSubCategoryExpand = (subCatKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedSubCategories(prev => ({ ...prev, [subCatKey]: !prev[subCatKey] }));
  };

  const hasActiveFilters = Boolean(selectedCategory || selectedSubCategory || selectedTopic || searchQuery);

  const categories = Object.keys(taxonomy).sort((a, b) => {
    return (taxonomy[b]?.count || 0) - (taxonomy[a]?.count || 0);
  });

  return (
    <aside className={`h-full flex flex-col justify-between py-8 px-6 border-r border-[#eeeeee] transition-all duration-500 bg-white select-none ${isCompact ? 'w-[260px]' : 'w-[320px] lg:w-[360px]'}`}>
      <div className="flex flex-col gap-6 overflow-hidden">
        {/* Header / Brand Logo */}
        <div className="flex flex-col gap-1">
          <button
            onClick={onReset}
            className="text-left font-black tracking-[-0.05em] text-2xl lg:text-3xl text-black hover:opacity-70 transition-opacity font-sans"
          >
            XP Seoul
          </button>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase text-[#888888] tracking-wider">
            <span>Visual Culture & Wiki Archive</span>
            <span>·</span>
            <span className="text-black font-semibold">{filteredNotesCount.toLocaleString()} / {totalNotesCount.toLocaleString()}</span>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#999999]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search notes, aliases, topics..."
            className="w-full bg-[#f6f6f7] pl-8 pr-3 py-1.5 rounded-md text-xs font-sans text-black placeholder:text-[#999999] focus:outline-none focus:ring-1 focus:ring-black transition-all"
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

        {/* Filter Section Header */}
        <div className="flex items-center justify-between pt-2 border-t border-[#eeeeee]">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-wider text-[#777777] font-semibold">Filter Hierarchy</span>
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
            )}
          </div>
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="flex items-center gap-1 font-mono text-[10px] text-[#666666] hover:text-black underline underline-offset-2 transition-colors"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Active Filter Pills if any */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
            {selectedCategory && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-black text-white rounded">
                <span>{selectedCategory}</span>
                <button onClick={() => { onSelectCategory(null); onSelectSubCategory(null); onSelectTopic(null); }} className="hover:opacity-75">×</button>
              </span>
            )}
            {selectedSubCategory && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#e8e8e8] text-black rounded">
                <span>{selectedSubCategory}</span>
                <button onClick={() => { onSelectSubCategory(null); onSelectTopic(null); }} className="hover:opacity-75">×</button>
              </span>
            )}
            {selectedTopic && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#f0f0f0] border border-black/20 text-black rounded">
                <span>{selectedTopic}</span>
                <button onClick={() => onSelectTopic(null)} className="hover:opacity-75">×</button>
              </span>
            )}
          </div>
        )}

        {/* Category Drill-Down List */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1 text-xs">
          {categories.map((catName) => {
            const cat = taxonomy[catName];
            const isCatSelected = selectedCategory === catName;
            const isCatExpanded = Boolean(expandedCategories[catName]);
            const subCategories = Object.keys(cat.subCategories || {}).sort((a, b) => cat.subCategories[b].count - cat.subCategories[a].count);

            return (
              <div key={catName} className="flex flex-col">
                {/* Category Row */}
                <div
                  onClick={() => {
                    if (isCatSelected) {
                      onSelectCategory(null);
                      onSelectSubCategory(null);
                      onSelectTopic(null);
                    } else {
                      onSelectCategory(catName);
                      onSelectSubCategory(null);
                      onSelectTopic(null);
                      setExpandedCategories(prev => ({ ...prev, [catName]: true }));
                    }
                  }}
                  className={`group flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer transition-colors ${isCatSelected ? 'bg-black text-white font-medium' : 'hover:bg-[#f5f5f7] text-[#222222]'}`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <button
                      onClick={(e) => toggleCategoryExpand(catName, e)}
                      className={`p-0.5 rounded hover:bg-black/10 transition-colors ${isCatSelected ? 'text-white' : 'text-[#888888]'}`}
                    >
                      {isCatExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </button>
                    <span className="truncate">{catName}</span>
                  </div>
                  <span className={`font-mono text-[10px] ${isCatSelected ? 'text-white/70' : 'text-[#888888] group-hover:text-black'}`}>
                    {cat.count}
                  </span>
                </div>

                {/* Sub-Category Level */}
                {isCatExpanded && subCategories.length > 0 && (
                  <div className="flex flex-col ml-4 pl-2 border-l border-[#e5e5e5] my-0.5 gap-0.5">
                    {subCategories.map((subCatName) => {
                      const subCat = cat.subCategories[subCatName];
                      const subKey = `${catName}-${subCatName}`;
                      const isSubSelected = selectedSubCategory === subCatName;
                      const isSubExpanded = Boolean(expandedSubCategories[subKey]);
                      const topics = Object.keys(subCat.topics || {}).sort((a, b) => subCat.topics[b] - subCat.topics[a]);

                      return (
                        <div key={subCatName} className="flex flex-col">
                          <div
                            onClick={() => {
                              onSelectCategory(catName);
                              if (isSubSelected) {
                                onSelectSubCategory(null);
                                onSelectTopic(null);
                              } else {
                                onSelectSubCategory(subCatName);
                                onSelectTopic(null);
                                setExpandedSubCategories(prev => ({ ...prev, [subKey]: true }));
                              }
                            }}
                            className={`group flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-colors ${isSubSelected ? 'bg-[#222222] text-white font-medium' : 'hover:bg-[#f5f5f7] text-[#444444]'}`}
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              {topics.length > 0 && (
                                <button
                                  onClick={(e) => toggleSubCategoryExpand(subKey, e)}
                                  className={`p-0.5 rounded hover:bg-black/10 ${isSubSelected ? 'text-white' : 'text-[#999999]'}`}
                                >
                                  {isSubExpanded ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
                                </button>
                              )}
                              <span className="truncate">{subCatName}</span>
                            </div>
                            <span className={`font-mono text-[10px] ${isSubSelected ? 'text-white/70' : 'text-[#888888]'}`}>
                              {subCat.count}
                            </span>
                          </div>

                          {/* Topics Level */}
                          {isSubExpanded && topics.length > 0 && (
                            <div className="flex flex-col ml-3 pl-2 border-l border-[#e5e5e5] my-0.5 gap-0.5">
                              {topics.slice(0, 15).map((topicName) => {
                                const topicCount = subCat.topics[topicName];
                                const isTopicSelected = selectedTopic === topicName;

                                return (
                                  <div
                                    key={topicName}
                                    onClick={() => {
                                      onSelectCategory(catName);
                                      onSelectSubCategory(subCatName);
                                      onSelectTopic(isTopicSelected ? null : topicName);
                                    }}
                                    className={`flex items-center justify-between px-1.5 py-0.5 rounded cursor-pointer transition-colors ${isTopicSelected ? 'bg-black text-white font-medium' : 'hover:bg-[#f0f0f2] text-[#666666]'}`}
                                  >
                                    <span className="truncate text-[11px]">{topicName}</span>
                                    <span className={`font-mono text-[9px] ${isTopicSelected ? 'text-white/70' : 'text-[#aaaaaa]'}`}>
                                      {topicCount}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-[#eeeeee] flex items-center justify-between text-[11px] font-mono text-[#888888]">
        <span>XP-SEOUL V1.0</span>
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-black" />
          <span>Curated Wiki</span>
        </span>
      </div>
    </aside>
  );
};
