import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, RotateCcw, ChevronRight, Plus } from 'lucide-react';
import type { FacetTaxonomyData } from './TopFilterBarFacet';

export interface ActiveFilterSlot {
  id: string;
  axis: 'category' | 'type' | 'field';
  label: string; // e.g. "The Arts" or "Visual Art" or "Art Platform"
  category?: string | null;
  subCategory?: string | null;
  type?: string | null;
  subType?: string | null;
  field?: string | null;
  subField?: string | null;
  topic?: string | null;
}

interface MultiFacetFilterBarProps {
  facetData: FacetTaxonomyData;
  totalNotesCount: number;
  filteredNotesCount: number;
  activeFilterSlots: ActiveFilterSlot[];
  onAddFilterSlot: (slot: ActiveFilterSlot) => void;
  onRemoveFilterSlot: (id: string) => void;
  onClearAllSlots: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isDesktop?: boolean;
}

export const MultiFacetFilterBar: React.FC<MultiFacetFilterBarProps> = ({
  facetData,
  totalNotesCount,
  filteredNotesCount,
  activeFilterSlots,
  onAddFilterSlot,
  onRemoveFilterSlot,
  onClearAllSlots,
  searchQuery,
  onSearchChange,
  isDesktop = false,
}) => {
  const [currentAxis, setCurrentAxis] = useState<'category' | 'type' | 'field'>('category');
  const [isSearchOpen, setIsSearchOpen] = useState(Boolean(searchQuery));

  // Draft filter selections before adding to stack
  const [draftPrimary, setDraftPrimary] = useState<string | null>(null);
  const [draftSecondary, setDraftSecondary] = useState<string | null>(null);

  // Hidden safety threshold limit (20)
  const MAX_SLOTS = 20;
  const canAddMore = activeFilterSlots.length < MAX_SLOTS;

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

  // Secondary (sub) list for current axis
  const secondaryList = useMemo(() => {
    if (!draftPrimary) return [];
    if (currentAxis === 'category') {
      const parent = facetData.byCategory?.[draftPrimary];
      return Object.entries(parent?.subs || {})
        .sort((a, b) => b[1].count - a[1].count)
        .map(([name, data]) => ({ name, count: data.count }));
    }
    if (currentAxis === 'type') {
      const parent = facetData.byType?.[draftPrimary];
      return Object.entries(parent?.subs || {})
        .sort((a, b) => b[1].count - a[1].count)
        .map(([name, data]) => ({ name, count: data.count }));
    }
    if (currentAxis === 'field') {
      const parent = facetData.byField?.[draftPrimary];
      return Object.entries(parent?.subs || {})
        .sort((a, b) => b[1].count - a[1].count)
        .map(([name, data]) => ({ name, count: data.count }));
    }
    return [];
  }, [currentAxis, draftPrimary, facetData]);

  // Contextual topics list for current selection
  const contextualTopics = useMemo(() => {
    let topicMap: Record<string, number> = {};
    if (currentAxis === 'category' && draftPrimary) {
      if (draftSecondary) {
        topicMap = facetData.byCategory?.[draftPrimary]?.subs?.[draftSecondary]?.topics || {};
      } else {
        topicMap = facetData.byCategory?.[draftPrimary]?.topics || {};
      }
    } else if (currentAxis === 'type' && draftPrimary) {
      if (draftSecondary) {
        topicMap = facetData.byType?.[draftPrimary]?.subs?.[draftSecondary]?.topics || {};
      } else {
        topicMap = facetData.byType?.[draftPrimary]?.topics || {};
      }
    } else if (currentAxis === 'field' && draftPrimary) {
      if (draftSecondary) {
        topicMap = facetData.byField?.[draftPrimary]?.subs?.[draftSecondary]?.topics || {};
      } else {
        topicMap = facetData.byField?.[draftPrimary]?.topics || {};
      }
    }

    return Object.entries(topicMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [currentAxis, draftPrimary, draftSecondary, facetData]);

  // Commit and create slot: only shows the most specific item picked (최대분류 or 최종 토픽)
  const commitSlot = (options: {
    primary?: string | null;
    secondary?: string | null;
    topic?: string | null;
  }) => {
    const p = options.primary !== undefined ? options.primary : draftPrimary;
    const s = options.secondary !== undefined ? options.secondary : draftSecondary;
    const t = options.topic;

    if (!p && !s && !t) return;

    // Concise label: only the deepest specific topic/sub picked
    const label = t || s || p || '';

    const newSlot: ActiveFilterSlot = {
      id: `slot-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      axis: currentAxis,
      label,
      category: currentAxis === 'category' ? p : undefined,
      subCategory: currentAxis === 'category' ? s : undefined,
      type: currentAxis === 'type' ? p : undefined,
      subType: currentAxis === 'type' ? s : undefined,
      field: currentAxis === 'field' ? p : undefined,
      subField: currentAxis === 'field' ? s : undefined,
      topic: t,
    };

    onAddFilterSlot(newSlot);

    // Reset draft
    setDraftPrimary(null);
    setDraftSecondary(null);
  };

  return (
    <div className="w-full flex flex-col bg-white border-b border-[#eeeeee] shrink-0 select-none z-30 transition-all font-sans">
      {/* 1. TOP STACK ROW: Active Filter Slots */}
      <div className="flex items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-4 lg:px-8 py-2 gap-2 bg-[#f6f6f8] border-b border-[#e8e8ea]">
        <span className="font-semibold text-black uppercase tracking-wider text-[11px] font-mono shrink-0 mr-1">
          Filters
        </span>

        {/* Active Slots list */}
        {activeFilterSlots.length === 0 ? (
          <span className="text-xs font-mono text-[#888888] shrink-0 italic">
            Select category, type, or field below to add filter
          </span>
        ) : (
          activeFilterSlots.map((slot) => {
            const badgeLetter = slot.axis === 'category' ? 'C' : slot.axis === 'field' ? 'F' : 'T';
            return (
              <motion.div
                key={slot.id}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full bg-black text-white text-xs font-mono shrink-0 shadow-xs"
              >
                {/* Rounded box badge for C, F, T */}
                <span className="w-4 h-4 rounded-[4px] bg-white text-black flex items-center justify-center text-[10px] font-bold shrink-0">
                  {badgeLetter}
                </span>
                <span className="text-white/40 font-light text-[11px] select-none">|</span>
                <span className="font-medium truncate max-w-[200px] sm:max-w-[280px]">
                  {slot.label}
                </span>
                <button
                  onClick={() => onRemoveFilterSlot(slot.id)}
                  className="hover:text-red-300 p-0.5 rounded-full ml-0.5"
                  aria-label="Remove filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })
        )}

        {/* Clear All Button */}
        {activeFilterSlots.length > 0 && (
          <button
            onClick={onClearAllSlots}
            className="ml-auto px-2.5 py-1 rounded-md text-[11px] font-mono text-[#777777] hover:text-black hover:bg-[#eaeaea] transition-colors shrink-0 flex items-center gap-1 border border-dashed border-[#cccccc]"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear Stack</span>
          </button>
        )}
      </div>

      {/* 2. AXIS TABS: Category | Type | Field (No Icons, No 'Pick Dimension', Clean Text) */}
      <div className="flex items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-4 lg:px-8 py-2 gap-1.5 border-b border-[#f0f0f2] bg-[#fafafa]">
        {/* Category */}
        <button
          onClick={() => {
            setCurrentAxis('category');
            setDraftPrimary(null);
            setDraftSecondary(null);
          }}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
            currentAxis === 'category'
              ? 'bg-black text-white shadow-xs font-semibold'
              : 'bg-white border border-[#e5e5e7] text-[#444444] hover:bg-[#efeff1]'
          }`}
        >
          Category
        </button>

        {/* Type */}
        <button
          onClick={() => {
            setCurrentAxis('type');
            setDraftPrimary(null);
            setDraftSecondary(null);
          }}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
            currentAxis === 'type'
              ? 'bg-black text-white shadow-xs font-semibold'
              : 'bg-white border border-[#e5e5e7] text-[#444444] hover:bg-[#efeff1]'
          }`}
        >
          Type
        </button>

        {/* Field */}
        <button
          onClick={() => {
            setCurrentAxis('field');
            setDraftPrimary(null);
            setDraftSecondary(null);
          }}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
            currentAxis === 'field'
              ? 'bg-black text-white shadow-xs font-semibold'
              : 'bg-white border border-[#e5e5e7] text-[#444444] hover:bg-[#efeff1]'
          }`}
        >
          Field
        </button>

        {/* Search Toggle Button */}
        <button
          onClick={() => setIsSearchOpen((p) => !p)}
          className={`ml-auto p-1.5 rounded-md border text-xs font-mono transition-colors shrink-0 flex items-center justify-center ${
            isSearchOpen || searchQuery
              ? 'bg-black text-white border-black'
              : 'bg-white text-[#666666] border-[#eeeeee] hover:bg-[#eaeaea]'
          }`}
          title="Search Vault"
        >
          <Search className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 3. PRIMARY ITEMS ROW */}
      <div className="flex items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-4 lg:px-8 py-2.5 gap-2 bg-white">
        {primaryList.map((item) => {
          const isSelected = draftPrimary === item.name;
          return (
            <button
              key={item.name}
              onClick={() => {
                if (isSelected) {
                  setDraftPrimary(null);
                  setDraftSecondary(null);
                } else {
                  setDraftPrimary(item.name);
                  setDraftSecondary(null);
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

        {/* Quick Add Button if primary is selected */}
        {draftPrimary && canAddMore && (
          <button
            onClick={() => commitSlot({ primary: draftPrimary })}
            className="ml-auto px-3 py-1.5 rounded-md bg-black text-white text-xs font-mono font-semibold flex items-center gap-1.5 shrink-0 hover:bg-[#222222] shadow-xs"
          >
            <Plus className="w-3 h-3 stroke-[3]" />
            <span>Add "{draftPrimary}"</span>
          </button>
        )}
      </div>

      {/* 4. SECONDARY (SUB) ROW */}
      <AnimatePresence>
        {draftPrimary && secondaryList.length > 0 && (
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

              {secondaryList.map((sub) => {
                const isSubSelected = draftSecondary === sub.name;
                return (
                  <button
                    key={sub.name}
                    onClick={() => {
                      if (isSubSelected) {
                        setDraftSecondary(null);
                      } else {
                        setDraftSecondary(sub.name);
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

              {draftSecondary && canAddMore && (
                <button
                  onClick={() => commitSlot({ primary: draftPrimary, secondary: draftSecondary })}
                  className="ml-auto px-2.5 py-1 rounded-md bg-black text-white text-xs font-mono font-semibold flex items-center gap-1.5 shrink-0 hover:bg-[#222222] shadow-xs"
                >
                  <Plus className="w-3 h-3 stroke-[3]" />
                  <span>Add "{draftSecondary}"</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. TOPICS ROW */}
      <AnimatePresence>
        {contextualTopics.length > 0 && (
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

              {contextualTopics.slice(0, 45).map((top) => {
                return (
                  <button
                    key={top.name}
                    onClick={() => {
                      if (!canAddMore) return;
                      commitSlot({
                        primary: draftPrimary,
                        secondary: draftSecondary,
                        topic: top.name,
                      });
                    }}
                    className="px-2 py-0.5 rounded text-[11px] font-mono transition-all shrink-0 flex items-center gap-1.5 bg-white border border-[#e5e5e5] text-[#444444] hover:border-black hover:text-black shadow-2xs group"
                    title={`Click to add #${top.name} to Filters`}
                  >
                    <span>#{top.name}</span>
                    <span className="text-[9.5px] text-[#888888]">{top.count}</span>
                    <Plus className="w-2.5 h-2.5 text-[#888888] group-hover:text-black" />
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Search Bar */}
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
