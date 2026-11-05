import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, RotateCcw, ChevronRight, Layers, Tag, Briefcase, Box } from 'lucide-react';

export type FacetAxis = 'category' | 'type' | 'field' | 'topic';

export interface FacetTaxonomyData {
  allTopics: Array<{ name: string; count: number }>;
  byCategory: Record<string, { count: number; subs: Record<string, { count: number; topics: Record<string, number> }>; topics: Record<string, number> }>;
  byType: Record<string, { count: number; subs: Record<string, { count: number; topics: Record<string, number> }>; topics: Record<string, number> }>;
  byField: Record<string, { count: number; subs: Record<string, { count: number; topics: Record<string, number> }>; topics: Record<string, number> }>;
  byRegion?: Record<string, { count: number; subs: Record<string, { count: number; topics: Record<string, number> }>; topics: Record<string, number> }>;
}

export interface PrototypeFilterState {
  axis: FacetAxis;
  category: string | null;
  subCategory: string | null;
  type: string | null;
  subType: string | null;
  field: string | null;
  subField: string | null;
  topic: string | null;
}

interface TopFilterBarFacetProps {
  facetData: FacetTaxonomyData;
  totalNotesCount: number;
  filteredNotesCount: number;
  filterState: PrototypeFilterState;
  onFilterChange: (updater: (prev: PrototypeFilterState) => PrototypeFilterState) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onReset: () => void;
  isDesktop?: boolean;
}

export const TopFilterBarFacet: React.FC<TopFilterBarFacetProps> = ({
  facetData,
  totalNotesCount,
  filteredNotesCount,
  filterState,
  onFilterChange,
  searchQuery,
  onSearchChange,
  onReset,
  isDesktop = false,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(Boolean(searchQuery));
  const [topicSearch, setTopicSearch] = useState('');

  const currentAxis = filterState.axis;

  // Active filters count
  const activeCount = [
    filterState.category,
    filterState.subCategory,
    filterState.type,
    filterState.subType,
    filterState.field,
    filterState.subField,
    filterState.topic,
    searchQuery,
  ].filter(Boolean).length;

  // Primary list for current axis
  const primaryList = useMemo(() => {
    if (currentAxis === 'category') {
      return Object.entries(facetData.byCategory || {})
        .sort((a, b) => b[1].count - a[1].count)
        .map(([name, data]) => ({ name, count: data.count }));
    }
    if (currentAxis === 'type') {
      return Object.entries(facetData.byType || {})
        .sort((a, b) => b[1].count - a[1].count)
        .map(([name, data]) => ({ name, count: data.count }));
    }
    if (currentAxis === 'field') {
      return Object.entries(facetData.byField || {})
        .sort((a, b) => b[1].count - a[1].count)
        .map(([name, data]) => ({ name, count: data.count }));
    }
    return [];
  }, [currentAxis, facetData]);

  // Selected primary item
  const selectedPrimary =
    currentAxis === 'category'
      ? filterState.category
      : currentAxis === 'type'
      ? filterState.type
      : currentAxis === 'field'
      ? filterState.field
      : null;

  // Secondary (sub) list for current axis
  const secondaryList = useMemo(() => {
    if (!selectedPrimary) return [];
    if (currentAxis === 'category') {
      const parent = facetData.byCategory?.[selectedPrimary];
      return Object.entries(parent?.subs || {})
        .sort((a, b) => b[1].count - a[1].count)
        .map(([name, data]) => ({ name, count: data.count }));
    }
    if (currentAxis === 'type') {
      const parent = facetData.byType?.[selectedPrimary];
      return Object.entries(parent?.subs || {})
        .sort((a, b) => b[1].count - a[1].count)
        .map(([name, data]) => ({ name, count: data.count }));
    }
    if (currentAxis === 'field') {
      const parent = facetData.byField?.[selectedPrimary];
      return Object.entries(parent?.subs || {})
        .sort((a, b) => b[1].count - a[1].count)
        .map(([name, data]) => ({ name, count: data.count }));
    }
    return [];
  }, [currentAxis, selectedPrimary, facetData]);

  const selectedSecondary =
    currentAxis === 'category'
      ? filterState.subCategory
      : currentAxis === 'type'
      ? filterState.subType
      : currentAxis === 'field'
      ? filterState.subField
      : null;

  // Topics list for current axis / selection
  const contextualTopics = useMemo(() => {
    if (currentAxis === 'topic') {
      const list = facetData.allTopics || [];
      if (!topicSearch.trim()) return list;
      const q = topicSearch.toLowerCase().trim();
      return list.filter((t) => t.name.toLowerCase().includes(q));
    }

    let topicMap: Record<string, number> = {};
    if (currentAxis === 'category' && filterState.category) {
      if (filterState.subCategory) {
        topicMap = facetData.byCategory?.[filterState.category]?.subs?.[filterState.subCategory]?.topics || {};
      } else {
        topicMap = facetData.byCategory?.[filterState.category]?.topics || {};
      }
    } else if (currentAxis === 'type' && filterState.type) {
      if (filterState.subType) {
        topicMap = facetData.byType?.[filterState.type]?.subs?.[filterState.subType]?.topics || {};
      } else {
        topicMap = facetData.byType?.[filterState.type]?.topics || {};
      }
    } else if (currentAxis === 'field' && filterState.field) {
      if (filterState.subField) {
        topicMap = facetData.byField?.[filterState.field]?.subs?.[filterState.subField]?.topics || {};
      } else {
        topicMap = facetData.byField?.[filterState.field]?.topics || {};
      }
    }

    return Object.entries(topicMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [currentAxis, filterState, facetData, topicSearch]);

  return (
    <div className="w-full flex flex-col bg-white border-b border-[#eeeeee] shrink-0 select-none z-30 transition-all font-sans">
      {/* Top Banner: Prototype A Mode Indicator */}
      <div className="flex items-center justify-between px-4 lg:px-8 py-1.5 bg-[#f5f5f7] border-b border-[#e8e8ea] text-[11px] font-mono">
        <div className="flex items-center gap-2">
          <span className="font-bold text-black uppercase tracking-wider bg-black text-white px-2 py-0.5 rounded text-[10px]">
            Prototype A
          </span>
          <span className="text-[#555555]">Faceted Dimension Filter (Category · Type · Field · All Topics)</span>
        </div>
        <div className="flex items-center gap-3 text-[#666666]">
          <span>
            Matches: <strong className="text-black font-semibold">{filteredNotesCount.toLocaleString()}</strong> / {totalNotesCount.toLocaleString()}
          </span>
          <a
            href="/prototype-b"
            className="text-black underline underline-offset-2 hover:opacity-70 font-semibold"
          >
            Switch to Prototype B →
          </a>
        </div>
      </div>

      {/* Level 0: Axis Switcher Tabs (Category | Type | Field | All Topics) */}
      <div className="flex items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-4 lg:px-8 py-2 gap-1.5 border-b border-[#f0f0f2] bg-[#fafafa]">
        <span className="text-[10px] font-mono uppercase tracking-widest text-[#888888] mr-2 shrink-0">
          Filter Axis:
        </span>

        {/* 1. Category Tab */}
        <button
          onClick={() => onFilterChange((p) => ({ ...p, axis: 'category' }))}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 ${
            currentAxis === 'category'
              ? 'bg-black text-white shadow-xs font-semibold'
              : 'bg-white border border-[#e5e5e7] text-[#444444] hover:bg-[#efeff1]'
          }`}
        >
          <Box className="w-3.5 h-3.5" />
          <span>Category & SubCat</span>
          {filterState.category && (
            <span className="w-1.5 h-1.5 rounded-full bg-white ml-0.5" />
          )}
        </button>

        {/* 2. Type Tab */}
        <button
          onClick={() => onFilterChange((p) => ({ ...p, axis: 'type' }))}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 ${
            currentAxis === 'type'
              ? 'bg-black text-white shadow-xs font-semibold'
              : 'bg-white border border-[#e5e5e7] text-[#444444] hover:bg-[#efeff1]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Type & SubType</span>
          {filterState.type && (
            <span className="w-1.5 h-1.5 rounded-full bg-white ml-0.5" />
          )}
        </button>

        {/* 3. Field Tab */}
        <button
          onClick={() => onFilterChange((p) => ({ ...p, axis: 'field' }))}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 ${
            currentAxis === 'field'
              ? 'bg-black text-white shadow-xs font-semibold'
              : 'bg-white border border-[#e5e5e7] text-[#444444] hover:bg-[#efeff1]'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>Field & SubField</span>
          {filterState.field && (
            <span className="w-1.5 h-1.5 rounded-full bg-white ml-0.5" />
          )}
        </button>

        {/* 4. All Topics Tab (182 topics directly accessible!) */}
        <button
          onClick={() => onFilterChange((p) => ({ ...p, axis: 'topic' }))}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 ${
            currentAxis === 'topic'
              ? 'bg-black text-white shadow-xs font-semibold'
              : 'bg-white border border-[#e5e5e7] text-[#444444] hover:bg-[#efeff1]'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>All Topics (182)</span>
          {filterState.topic && (
            <span className="w-1.5 h-1.5 rounded-full bg-white ml-0.5" />
          )}
        </button>

        {/* Reset All Filters */}
        {activeCount > 0 && (
          <button
            onClick={onReset}
            className="ml-auto px-2.5 py-1 rounded-md text-[11px] font-mono text-[#777777] hover:text-black hover:bg-[#eaeaea] transition-colors shrink-0 flex items-center gap-1 border border-dashed border-[#cccccc]"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset ({activeCount})</span>
          </button>
        )}
      </div>

      {/* Level 1: Primary Axis Items (or Topic Search when in 'topic' axis) */}
      <div className="flex items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-4 lg:px-8 py-2.5 gap-2 bg-white">
        {/* Search Toggle */}
        <button
          onClick={() => setIsSearchOpen((p) => !p)}
          className={`p-1.5 rounded-md border text-xs font-mono transition-colors shrink-0 flex items-center justify-center ${
            isSearchOpen || searchQuery
              ? 'bg-black text-white border-black'
              : 'bg-[#f6f6f7] text-[#666666] border-[#eeeeee] hover:bg-[#eaeaea]'
          }`}
          title="Search Vault"
        >
          <Search className="w-3.5 h-3.5" />
        </button>

        {currentAxis !== 'topic' ? (
          <>
            {/* 'All' button for current axis */}
            <button
              onClick={() => {
                if (currentAxis === 'category') onFilterChange((p) => ({ ...p, category: null, subCategory: null }));
                if (currentAxis === 'type') onFilterChange((p) => ({ ...p, type: null, subType: null }));
                if (currentAxis === 'field') onFilterChange((p) => ({ ...p, field: null, subField: null }));
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors shrink-0 ${
                !selectedPrimary
                  ? 'bg-black text-white font-semibold shadow-xs'
                  : 'bg-[#f4f4f5] text-[#555555] hover:bg-[#eaeaea]'
              }`}
            >
              All {currentAxis}
            </button>

            {/* Primary Pills */}
            {primaryList.map((item) => {
              const isSelected = selectedPrimary === item.name;
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    if (currentAxis === 'category') {
                      onFilterChange((p) => ({
                        ...p,
                        category: isSelected ? null : item.name,
                        subCategory: null,
                      }));
                    } else if (currentAxis === 'type') {
                      onFilterChange((p) => ({
                        ...p,
                        type: isSelected ? null : item.name,
                        subType: null,
                      }));
                    } else if (currentAxis === 'field') {
                      onFilterChange((p) => ({
                        ...p,
                        field: isSelected ? null : item.name,
                        subField: null,
                      }));
                    }
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all shrink-0 flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-black text-white font-semibold shadow-xs'
                      : 'bg-[#f4f4f5] text-[#333333] hover:bg-[#eaeaea]'
                  }`}
                >
                  <span>{item.name}</span>
                  <span className={`text-[10px] ${isSelected ? 'text-white/70' : 'text-[#888888]'}`}>
                    {item.count}
                  </span>
                </button>
              );
            })}
          </>
        ) : (
          /* Topic Axis Quick Search */
          <div className="flex items-center gap-2 flex-1 max-w-sm bg-[#f5f5f7] px-3 py-1.5 rounded-md border border-[#e5e5e7]">
            <Search className="w-3.5 h-3.5 text-[#888888]" />
            <input
              type="text"
              placeholder="Filter from 182 topics (e.g. Studio, Magazine, K-Pop)..."
              value={topicSearch}
              onChange={(e) => setTopicSearch(e.target.value)}
              className="bg-transparent text-xs font-mono outline-none w-full"
            />
            {topicSearch && (
              <button onClick={() => setTopicSearch('')} className="text-[#888888] hover:text-black">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Level 2: Secondary (Sub) Row (Appears when primary item selected in Category / Type / Field) */}
      <AnimatePresence>
        {selectedPrimary && secondaryList.length > 0 && currentAxis !== 'topic' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-[#f0f0f0] bg-[#fafafa]"
          >
            <div className="flex items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-4 lg:px-8 py-2 gap-2">
              <span className="text-[10px] font-mono text-[#999999] uppercase tracking-wider shrink-0 flex items-center gap-1">
                <span>SUB</span>
                <ChevronRight className="w-2.5 h-2.5" />
              </span>

              {/* Sub All */}
              <button
                onClick={() => {
                  if (currentAxis === 'category') onFilterChange((p) => ({ ...p, subCategory: null }));
                  if (currentAxis === 'type') onFilterChange((p) => ({ ...p, subType: null }));
                  if (currentAxis === 'field') onFilterChange((p) => ({ ...p, subField: null }));
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors shrink-0 ${
                  !selectedSecondary
                    ? 'bg-black text-white font-semibold shadow-xs'
                    : 'bg-white border border-[#e5e5e5] text-[#555555] hover:bg-[#f0f0f0]'
                }`}
              >
                All {selectedPrimary}
              </button>

              {secondaryList.map((sub) => {
                const isSubSelected = selectedSecondary === sub.name;
                return (
                  <button
                    key={sub.name}
                    onClick={() => {
                      if (currentAxis === 'category') {
                        onFilterChange((p) => ({
                          ...p,
                          subCategory: isSubSelected ? null : sub.name,
                        }));
                      } else if (currentAxis === 'type') {
                        onFilterChange((p) => ({
                          ...p,
                          subType: isSubSelected ? null : sub.name,
                        }));
                      } else if (currentAxis === 'field') {
                        onFilterChange((p) => ({
                          ...p,
                          subField: isSubSelected ? null : sub.name,
                        }));
                      }
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all shrink-0 flex items-center gap-1.5 ${
                      isSubSelected
                        ? 'bg-black text-white font-semibold shadow-xs'
                        : 'bg-white border border-[#e5e5e5] text-[#444444] hover:bg-[#f0f0f0]'
                    }`}
                  >
                    <span>{sub.name}</span>
                    <span className={`text-[10px] ${isSubSelected ? 'text-white/70' : 'text-[#888888]'}`}>
                      {sub.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Level 3: Topics Row (Shows related topics for current selection, or all 182 topics in topic axis!) */}
      <AnimatePresence>
        {(currentAxis === 'topic' || contextualTopics.length > 0) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-[#f0f0f0] bg-[#fdfdfd]"
          >
            <div className="flex items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-4 lg:px-8 py-2 gap-1.5">
              <span className="text-[10px] font-mono text-[#999999] uppercase tracking-wider shrink-0 flex items-center gap-1">
                <span>TOPIC</span>
                <ChevronRight className="w-2.5 h-2.5" />
              </span>

              {/* All Topics reset pill */}
              <button
                onClick={() => onFilterChange((p) => ({ ...p, topic: null }))}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors shrink-0 ${
                  !filterState.topic
                    ? 'bg-black text-white font-semibold'
                    : 'bg-white border border-[#e5e5e5] text-[#555555] hover:bg-[#f0f0f0]'
                }`}
              >
                All Topics
              </button>

              {contextualTopics.slice(0, 40).map((top) => {
                const isTopSelected = filterState.topic === top.name;
                return (
                  <button
                    key={top.name}
                    onClick={() => {
                      onFilterChange((p) => ({
                        ...p,
                        topic: isTopSelected ? null : top.name,
                      }));
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all shrink-0 flex items-center gap-1.5 ${
                      isTopSelected
                        ? 'bg-black text-white font-semibold shadow-xs'
                        : 'bg-white border border-[#e5e5e5] text-[#444444] hover:border-black/30 hover:text-black'
                    }`}
                  >
                    <span>{top.name}</span>
                    <span className={`text-[9.5px] ${isTopSelected ? 'text-white/70' : 'text-[#888888]'}`}>
                      {top.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Search Bar Overlay */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-[#f0f0f0] px-4 lg:px-8 py-2 bg-[#fcfcfd]"
          >
            <div className="flex items-center gap-2 bg-[#f5f5f7] px-3.5 py-1.5 rounded-lg border border-[#e8e8ea] max-w-xl">
              <Search className="w-3.5 h-3.5 text-[#888888] shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search across title, alias, topic, tldr, city..."
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
    </div>
  );
};
