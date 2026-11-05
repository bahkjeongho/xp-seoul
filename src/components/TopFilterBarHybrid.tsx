import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, RotateCcw, ChevronRight, Filter } from 'lucide-react';
import type { FacetTaxonomyData } from './TopFilterBarFacet';

export interface PrototypeBFilterState {
  category: string | null;
  subCategory: string | null;
  type: string | null;
  field: string | null;
  topic: string | null;
}

interface TopFilterBarHybridProps {
  facetData: FacetTaxonomyData;
  totalNotesCount: number;
  filteredNotesCount: number;
  filterState: PrototypeBFilterState;
  onFilterChange: (updater: (prev: PrototypeBFilterState) => PrototypeBFilterState) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onReset: () => void;
}

export const TopFilterBarHybrid: React.FC<TopFilterBarHybridProps> = ({
  facetData,
  totalNotesCount,
  filteredNotesCount,
  filterState,
  onFilterChange,
  searchQuery,
  onSearchChange,
  onReset,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(Boolean(searchQuery));
  const [activeFacetPill, setActiveFacetPill] = useState<'category' | 'type' | 'field' | 'topic'>('category');

  // Active filters count
  const activeCount = [
    filterState.category,
    filterState.subCategory,
    filterState.type,
    filterState.field,
    filterState.topic,
    searchQuery,
  ].filter(Boolean).length;

  // Categories list
  const categories = useMemo(() => {
    return Object.entries(facetData.byCategory || {})
      .sort((a, b) => b[1].count - a[1].count)
      .map(([name, data]) => ({ name, count: data.count }));
  }, [facetData]);

  // Types list
  const types = useMemo(() => {
    return Object.entries(facetData.byType || {})
      .sort((a, b) => b[1].count - a[1].count)
      .map(([name, data]) => ({ name, count: data.count }));
  }, [facetData]);

  // Fields list (top 20)
  const fields = useMemo(() => {
    return Object.entries(facetData.byField || {})
      .sort((a, b) => b[1].count - a[1].count)
      .map(([name, data]) => ({ name, count: data.count }));
  }, [facetData]);

  // All 182 Topics
  const allTopics = facetData.allTopics || [];

  return (
    <div className="w-full flex flex-col bg-white border-b border-[#eeeeee] shrink-0 select-none z-30 transition-all font-sans">
      {/* Top Banner: Prototype B Mode Indicator */}
      <div className="flex items-center justify-between px-4 lg:px-8 py-1.5 bg-[#f5f5f7] border-b border-[#e8e8ea] text-[11px] font-mono">
        <div className="flex items-center gap-2">
          <span className="font-bold text-black uppercase tracking-wider bg-black text-white px-2 py-0.5 rounded text-[10px]">
            Prototype B
          </span>
          <span className="text-[#555555]">Hybrid Parallel Filter (Multi-select Category + Type + Field + Topics in tandem)</span>
        </div>
        <div className="flex items-center gap-3 text-[#666666]">
          <span>
            Matches: <strong className="text-black font-semibold">{filteredNotesCount.toLocaleString()}</strong> / {totalNotesCount.toLocaleString()}
          </span>
          <a
            href="/prototype-a"
            className="text-black underline underline-offset-2 hover:opacity-70 font-semibold"
          >
            ← Switch to Prototype A
          </a>
        </div>
      </div>

      {/* Row 1: Active Filter Chips Bar + Facet Switcher Chips */}
      <div className="flex items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-4 lg:px-8 py-2 gap-2 border-b border-[#f0f0f2] bg-[#fafafa]">
        {/* Search Toggle */}
        <button
          onClick={() => setIsSearchOpen((p) => !p)}
          className={`p-1.5 rounded-md border text-xs font-mono transition-colors shrink-0 flex items-center justify-center ${
            isSearchOpen || searchQuery
              ? 'bg-black text-white border-black'
              : 'bg-white text-[#666666] border-[#e0e0e0] hover:bg-[#eaeaea]'
          }`}
          title="Search Vault"
        >
          <Search className="w-3.5 h-3.5" />
        </button>

        {/* Selected Filter Chips with instant X removal */}
        {filterState.category && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black text-white text-xs font-mono shrink-0">
            <span>Cat: {filterState.category}</span>
            <button
              onClick={() => onFilterChange((p) => ({ ...p, category: null, subCategory: null }))}
              className="hover:text-red-300"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        {filterState.type && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black text-white text-xs font-mono shrink-0">
            <span>Type: {filterState.type}</span>
            <button
              onClick={() => onFilterChange((p) => ({ ...p, type: null }))}
              className="hover:text-red-300"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        {filterState.field && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black text-white text-xs font-mono shrink-0">
            <span>Field: {filterState.field}</span>
            <button
              onClick={() => onFilterChange((p) => ({ ...p, field: null }))}
              className="hover:text-red-300"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        {filterState.topic && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black text-white text-xs font-mono shrink-0">
            <span>#{filterState.topic}</span>
            <button
              onClick={() => onFilterChange((p) => ({ ...p, topic: null }))}
              className="hover:text-red-300"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        {activeCount === 0 && (
          <span className="text-xs font-mono text-[#888888] shrink-0">
            No filters applied · Showing all notes
          </span>
        )}

        {/* Reset All */}
        {activeCount > 0 && (
          <button
            onClick={onReset}
            className="ml-auto px-2.5 py-1 rounded-md text-[11px] font-mono text-[#777777] hover:text-black hover:bg-[#eaeaea] transition-colors shrink-0 flex items-center gap-1 border border-dashed border-[#cccccc]"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset All</span>
          </button>
        )}
      </div>

      {/* Row 2: Facet Drawer Tabs (Category | Type | Field | Topic) */}
      <div className="flex items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-4 lg:px-8 py-2 gap-2 bg-[#fdfdfd] border-b border-[#f0f0f2]">
        <span className="text-[10px] font-mono uppercase tracking-wider text-[#999999] shrink-0 mr-1">
          Pick Facet:
        </span>

        <button
          onClick={() => setActiveFacetPill('category')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0 ${
            activeFacetPill === 'category'
              ? 'bg-[#222222] text-white font-semibold'
              : 'bg-white border border-[#e5e5e7] text-[#555555] hover:bg-[#f2f2f4]'
          }`}
        >
          Categories ({categories.length})
        </button>

        <button
          onClick={() => setActiveFacetPill('type')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0 ${
            activeFacetPill === 'type'
              ? 'bg-[#222222] text-white font-semibold'
              : 'bg-white border border-[#e5e5e7] text-[#555555] hover:bg-[#f2f2f4]'
          }`}
        >
          Types ({types.length})
        </button>

        <button
          onClick={() => setActiveFacetPill('field')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0 ${
            activeFacetPill === 'field'
              ? 'bg-[#222222] text-white font-semibold'
              : 'bg-white border border-[#e5e5e7] text-[#555555] hover:bg-[#f2f2f4]'
          }`}
        >
          Fields ({fields.length})
        </button>

        <button
          onClick={() => setActiveFacetPill('topic')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0 ${
            activeFacetPill === 'topic'
              ? 'bg-[#222222] text-white font-semibold'
              : 'bg-white border border-[#e5e5e7] text-[#555555] hover:bg-[#f2f2f4]'
          }`}
        >
          All Topics ({allTopics.length})
        </button>
      </div>

      {/* Row 3: Items for the currently selected Facet Pill */}
      <div className="flex items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-4 lg:px-8 py-2.5 gap-1.5 bg-white">
        {activeFacetPill === 'category' &&
          categories.map((c) => {
            const isSelected = filterState.category === c.name;
            return (
              <button
                key={c.name}
                onClick={() =>
                  onFilterChange((p) => ({
                    ...p,
                    category: isSelected ? null : c.name,
                    subCategory: null,
                  }))
                }
                className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-black text-white font-semibold shadow-xs'
                    : 'bg-[#f4f4f5] text-[#333333] hover:bg-[#eaeaea]'
                }`}
              >
                <span>{c.name}</span>
                <span className={`text-[10px] ${isSelected ? 'text-white/70' : 'text-[#888888]'}`}>
                  {c.count}
                </span>
              </button>
            );
          })}

        {activeFacetPill === 'type' &&
          types.map((t) => {
            const isSelected = filterState.type === t.name;
            return (
              <button
                key={t.name}
                onClick={() =>
                  onFilterChange((p) => ({
                    ...p,
                    type: isSelected ? null : t.name,
                  }))
                }
                className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-black text-white font-semibold shadow-xs'
                    : 'bg-[#f4f4f5] text-[#333333] hover:bg-[#eaeaea]'
                }`}
              >
                <span>{t.name}</span>
                <span className={`text-[10px] ${isSelected ? 'text-white/70' : 'text-[#888888]'}`}>
                  {t.count}
                </span>
              </button>
            );
          })}

        {activeFacetPill === 'field' &&
          fields.slice(0, 30).map((f) => {
            const isSelected = filterState.field === f.name;
            return (
              <button
                key={f.name}
                onClick={() =>
                  onFilterChange((p) => ({
                    ...p,
                    field: isSelected ? null : f.name,
                  }))
                }
                className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-black text-white font-semibold shadow-xs'
                    : 'bg-[#f4f4f5] text-[#333333] hover:bg-[#eaeaea]'
                }`}
              >
                <span>{f.name}</span>
                <span className={`text-[10px] ${isSelected ? 'text-white/70' : 'text-[#888888]'}`}>
                  {f.count}
                </span>
              </button>
            );
          })}

        {activeFacetPill === 'topic' &&
          allTopics.slice(0, 45).map((top) => {
            const isSelected = filterState.topic === top.name;
            return (
              <button
                key={top.name}
                onClick={() =>
                  onFilterChange((p) => ({
                    ...p,
                    topic: isSelected ? null : top.name,
                  }))
                }
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-black text-white font-semibold shadow-xs'
                    : 'bg-white border border-[#e5e5e5] text-[#444444] hover:border-black/30 hover:text-black'
                }`}
              >
                <span>#{top.name}</span>
                <span className={`text-[9.5px] ${isSelected ? 'text-white/70' : 'text-[#888888]'}`}>
                  {top.count}
                </span>
              </button>
            );
          })}
      </div>

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
