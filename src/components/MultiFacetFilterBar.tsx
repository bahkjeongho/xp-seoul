import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, RotateCcw, ChevronRight, Plus, Shuffle } from 'lucide-react';
import type { FacetTaxonomyData } from './TopFilterBarFacet';

export type SortOrder = 'random' | 'asc' | 'desc';

export interface ActiveFilterSlot {
  id: string;
  axis: 'category' | 'type' | 'field' | 'region';
  label: string; // e.g. "The Arts" or "Visual Art" or "Art Platform" or "South Korea" or "Seoul"
  category?: string | null;
  subCategory?: string | null;
  type?: string | null;
  subType?: string | null;
  field?: string | null;
  subField?: string | null;
  country?: string | null;
  city?: string | null;
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
  sortOrder?: SortOrder;
  onSortOrderChange?: (order: SortOrder) => void;
  onReshuffle?: () => void;
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
  sortOrder = 'random',
  onSortOrderChange,
  onReshuffle,
  isDesktop = false,
}) => {
  const [currentAxis, setCurrentAxis] = useState<'category' | 'type' | 'field' | 'region'>('category');
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
    if (currentAxis === 'region') {
      return Object.entries(facetData.byRegion || {})
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
    if (currentAxis === 'region') {
      const parent = facetData.byRegion?.[draftPrimary];
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
    } else if (currentAxis === 'region' && draftPrimary) {
      if (draftSecondary) {
        topicMap = facetData.byRegion?.[draftPrimary]?.subs?.[draftSecondary]?.topics || {};
      } else {
        topicMap = facetData.byRegion?.[draftPrimary]?.topics || {};
      }
    }

    return Object.entries(topicMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [currentAxis, draftPrimary, draftSecondary, facetData]);

  // Helper to find if an identical slot is currently in activeFilterSlots
  const findMatchingSlot = (options: {
    primary?: string | null;
    secondary?: string | null;
    topic?: string | null;
  }) => {
    const p = options.primary !== undefined ? options.primary : draftPrimary;
    const s = options.secondary !== undefined ? options.secondary : draftSecondary;
    const t = options.topic;

    return activeFilterSlots.find((slot) => {
      if (slot.axis !== currentAxis) return false;
      if (t) {
        return slot.topic === t;
      }
      if (s) {
        return (
          !slot.topic &&
          ((currentAxis === 'category' && slot.category === p && slot.subCategory === s) ||
            (currentAxis === 'type' && slot.type === p && slot.subType === s) ||
            (currentAxis === 'field' && slot.field === p && slot.subField === s) ||
            (currentAxis === 'region' && slot.country === p && slot.city === s))
        );
      }
      if (p) {
        return (
          !slot.topic &&
          !slot.subCategory &&
          !slot.subType &&
          !slot.subField &&
          !slot.city &&
          ((currentAxis === 'category' && slot.category === p) ||
            (currentAxis === 'type' && slot.type === p) ||
            (currentAxis === 'field' && slot.field === p) ||
            (currentAxis === 'region' && slot.country === p))
        );
      }
      return false;
    });
  };

  // Toggle or add filter slot with hierarchical refinement
  const toggleOrAddSlot = (options: {
    primary?: string | null;
    secondary?: string | null;
    topic?: string | null;
  }) => {
    const p = options.primary !== undefined ? options.primary : draftPrimary;
    const s = options.secondary !== undefined ? options.secondary : draftSecondary;
    const t = options.topic;

    if (!p && !s && !t) return;

    const isUnderPrimary = (slot: ActiveFilterSlot) => {
      if (slot.axis !== currentAxis) return false;
      if (currentAxis === 'category') return slot.category === p;
      if (currentAxis === 'type') return slot.type === p;
      if (currentAxis === 'field') return slot.field === p;
      if (currentAxis === 'region') return slot.country === p;
      return false;
    };

    const isPurePrimary = (slot: ActiveFilterSlot) => {
      return (
        isUnderPrimary(slot) &&
        !slot.subCategory &&
        !slot.subType &&
        !slot.subField &&
        !slot.city &&
        !slot.topic
      );
    };

    const isUnderSecondary = (slot: ActiveFilterSlot) => {
      if (!isUnderPrimary(slot)) return false;
      if (currentAxis === 'category') return slot.subCategory === s;
      if (currentAxis === 'type') return slot.subType === s;
      if (currentAxis === 'field') return slot.subField === s;
      if (currentAxis === 'region') return slot.city === s;
      return false;
    };

    const isPureSecondary = (slot: ActiveFilterSlot) => {
      return isUnderSecondary(slot) && !slot.topic;
    };

    // 1. TOPIC CLICKED
    if (t) {
      const existing = activeFilterSlots.find((slot) => isUnderSecondary(slot) && slot.topic === t);
      if (existing) {
        onRemoveFilterSlot(existing.id);
        const remainingTopics = activeFilterSlots.filter(
          (slot) => slot.id !== existing.id && isUnderSecondary(slot) && Boolean(slot.topic)
        );
        if (remainingTopics.length === 0 && s) {
          // Restore pure secondary slot
          onAddFilterSlot({
            id: `slot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            axis: currentAxis,
            label: s,
            category: currentAxis === 'category' ? p : undefined,
            subCategory: currentAxis === 'category' ? s : undefined,
            type: currentAxis === 'type' ? p : undefined,
            subType: currentAxis === 'type' ? s : undefined,
            field: currentAxis === 'field' ? p : undefined,
            subField: currentAxis === 'field' ? s : undefined,
            country: currentAxis === 'region' ? p : undefined,
            city: currentAxis === 'region' ? s : undefined,
          });
        }
        return;
      }

      if (!canAddMore) return;

      // When picking a topic, remove pure parent secondary / primary slots
      const pureSec = activeFilterSlots.find(isPureSecondary);
      if (pureSec) onRemoveFilterSlot(pureSec.id);
      const purePrim = activeFilterSlots.find(isPurePrimary);
      if (purePrim) onRemoveFilterSlot(purePrim.id);

      onAddFilterSlot({
        id: `slot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        axis: currentAxis,
        label: `#${t}`,
        category: currentAxis === 'category' ? p : undefined,
        subCategory: currentAxis === 'category' ? s : undefined,
        type: currentAxis === 'type' ? p : undefined,
        subType: currentAxis === 'type' ? s : undefined,
        field: currentAxis === 'field' ? p : undefined,
        subField: currentAxis === 'field' ? s : undefined,
        country: currentAxis === 'region' ? p : undefined,
        city: currentAxis === 'region' ? s : undefined,
        topic: t,
      });
      return;
    }

    // 2. SECONDARY (SUB) CLICKED
    if (s) {
      const existing = activeFilterSlots.find(isPureSecondary);
      if (existing) {
        onRemoveFilterSlot(existing.id);
        const remainingUnderPrimary = activeFilterSlots.filter(
          (slot) => slot.id !== existing.id && isUnderPrimary(slot)
        );
        if (remainingUnderPrimary.length === 0 && p) {
          // No other sub or topic under primary, restore primary!
          onAddFilterSlot({
            id: `slot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            axis: currentAxis,
            label: p,
            category: currentAxis === 'category' ? p : undefined,
            type: currentAxis === 'type' ? p : undefined,
            field: currentAxis === 'field' ? p : undefined,
            country: currentAxis === 'region' ? p : undefined,
          });
        }
        return;
      }

      if (!canAddMore) return;

      // Refinement: remove broad pure primary slot
      const purePrim = activeFilterSlots.find(isPurePrimary);
      if (purePrim) onRemoveFilterSlot(purePrim.id);

      onAddFilterSlot({
        id: `slot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        axis: currentAxis,
        label: s,
        category: currentAxis === 'category' ? p : undefined,
        subCategory: currentAxis === 'category' ? s : undefined,
        type: currentAxis === 'type' ? p : undefined,
        subType: currentAxis === 'type' ? s : undefined,
        field: currentAxis === 'field' ? p : undefined,
        subField: currentAxis === 'field' ? s : undefined,
        country: currentAxis === 'region' ? p : undefined,
        city: currentAxis === 'region' ? s : undefined,
      });
      return;
    }

    // 3. PRIMARY CLICKED
    if (p) {
      const slotsUnder = activeFilterSlots.filter(isUnderPrimary);
      if (slotsUnder.length > 0) {
        // Toggle OFF: remove all slots under primary
        slotsUnder.forEach((sl) => onRemoveFilterSlot(sl.id));
        return;
      }

      if (!canAddMore) return;

      onAddFilterSlot({
        id: `slot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        axis: currentAxis,
        label: p,
        category: currentAxis === 'category' ? p : undefined,
        type: currentAxis === 'type' ? p : undefined,
        field: currentAxis === 'field' ? p : undefined,
        country: currentAxis === 'region' ? p : undefined,
      });
      return;
    }
  };

  return (
    <div className="w-full flex flex-col bg-white border-b border-[#eeeeee] shrink-0 select-none z-30 transition-all font-sans">
      {/* 1. TOP STACK ROW: Active Filter Slots */}
      <div className="flex items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-4 lg:px-8 py-2 gap-2 bg-[#f6f6f8] border-b border-[#e8e8ea]">
        <div className="flex items-center gap-1.5 shrink-0 mr-1">
          <span className="font-semibold text-black uppercase tracking-wider text-[11px] font-mono">
            Filters
          </span>
          {/* Clear Button right next to Filters title on the left */}
          {activeFilterSlots.length > 0 && (
            <button
              onClick={onClearAllSlots}
              className="p-1 rounded-full text-[#777777] hover:text-black hover:bg-black/8 transition-colors shrink-0"
              title="Clear all active filters"
              aria-label="Clear all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Active Slots list */}
        {activeFilterSlots.length === 0 ? (
          <span className="text-xs font-mono text-[#888888] shrink-0 italic">
            Select category, type, field, or region below to add filter
          </span>
        ) : (
          activeFilterSlots.map((slot) => {
            const badgeLetter =
              slot.axis === 'category'
                ? 'C'
                : slot.axis === 'field'
                ? 'F'
                : slot.axis === 'region'
                ? 'R'
                : 'T';
            return (
              <motion.div
                key={slot.id}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full bg-black text-white text-xs font-mono shrink-0 shadow-xs"
              >
                {/* Rounded box badge for C, F, T, R */}
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
      </div>

      {/* 2. AXIS TABS: Category | Type | Field | Region + Sort Controls + Search */}
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

        {/* Region */}
        <button
          onClick={() => {
            setCurrentAxis('region');
            setDraftPrimary(null);
            setDraftSecondary(null);
          }}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
            currentAxis === 'region'
              ? 'bg-black text-white shadow-xs font-semibold'
              : 'bg-white border border-[#e5e5e7] text-[#444444] hover:bg-[#efeff1]'
          }`}
        >
          Region
        </button>

        {/* Note Sort Controls */}
        {onSortOrderChange && (
          <div className="ml-auto flex items-center bg-[#eeeeee]/80 p-0.5 rounded-lg border border-[#e0e0e3] text-[11px] font-mono shrink-0">
            <button
              onClick={() => {
                if (sortOrder === 'random') {
                  onReshuffle?.();
                } else {
                  onSortOrderChange('random');
                }
              }}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                sortOrder === 'random'
                  ? 'bg-white text-black font-semibold shadow-2xs'
                  : 'text-[#666666] hover:text-black'
              }`}
              title="Random sort (click again to reshuffle)"
            >
              <Shuffle className="w-3 h-3" />
              <span>Random</span>
            </button>
            <button
              onClick={() => onSortOrderChange('asc')}
              className={`px-2 py-1 rounded-md transition-all ${
                sortOrder === 'asc'
                  ? 'bg-white text-black font-semibold shadow-2xs'
                  : 'text-[#666666] hover:text-black'
              }`}
              title="Alphabetical A to Z"
            >
              A → Z
            </button>
            <button
              onClick={() => onSortOrderChange('desc')}
              className={`px-2 py-1 rounded-md transition-all ${
                sortOrder === 'desc'
                  ? 'bg-white text-black font-semibold shadow-2xs'
                  : 'text-[#666666] hover:text-black'
              }`}
              title="Alphabetical Z to A"
            >
              Z → A
            </button>
          </div>
        )}

        {/* Search Toggle Button */}
        <button
          onClick={() => setIsSearchOpen((p) => !p)}
          className={`p-1.5 rounded-md border text-xs font-mono transition-colors shrink-0 flex items-center justify-center ${
            !onSortOrderChange ? 'ml-auto ' : ''
          }${
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
          const isSlotActive = Boolean(findMatchingSlot({ primary: item.name, secondary: null, topic: null }));

          return (
            <button
              key={item.name}
              onClick={() => {
                if (isSelected) {
                  // If already selected, clicking it again toggles off!
                  toggleOrAddSlot({ primary: item.name, secondary: null });
                  setDraftPrimary(null);
                  setDraftSecondary(null);
                } else {
                  setDraftPrimary(item.name);
                  setDraftSecondary(null);
                  toggleOrAddSlot({ primary: item.name, secondary: null });
                }
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all shrink-0 flex items-center gap-1.5 ${
                isSelected || isSlotActive
                  ? 'bg-black text-white font-semibold shadow-xs'
                  : 'bg-[#f4f4f5] text-[#333333] hover:bg-[#eaeaea]'
              }`}
            >
              <span>{item.name}</span>
              <span className={`text-[10px] ${isSelected || isSlotActive ? 'text-white/70' : 'text-[#888888]'}`}>
                {item.count}
              </span>
            </button>
          );
        })}
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
                <span>{currentAxis === 'region' ? 'CITY' : 'SUB'}</span>
                <ChevronRight className="w-2.5 h-2.5" />
              </span>

              {secondaryList.map((sub) => {
                const isSlotActive = Boolean(findMatchingSlot({ primary: draftPrimary, secondary: sub.name, topic: null }));

                return (
                  <button
                    key={sub.name}
                    onClick={() => {
                      if (isSlotActive) {
                        if (draftSecondary === sub.name) {
                          setDraftSecondary(null);
                        }
                        toggleOrAddSlot({ primary: draftPrimary, secondary: sub.name });
                      } else {
                        setDraftSecondary(sub.name);
                        toggleOrAddSlot({ primary: draftPrimary, secondary: sub.name });
                      }
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all shrink-0 flex items-center gap-1.5 ${
                      isSlotActive
                        ? 'bg-black text-white font-semibold shadow-xs'
                        : 'bg-white border border-[#e5e5e5] text-[#444444] hover:bg-[#f0f0f0]'
                    }`}
                  >
                    <span>{sub.name}</span>
                    <span className={`text-[10px] ${isSlotActive ? 'text-white/70' : 'text-[#888888]'}`}>
                      {sub.count}
                    </span>
                  </button>
                );
              })}
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
                const isTopicActive = Boolean(findMatchingSlot({ primary: draftPrimary, secondary: draftSecondary, topic: top.name }));

                return (
                  <button
                    key={top.name}
                    onClick={() => {
                      toggleOrAddSlot({
                        primary: draftPrimary,
                        secondary: draftSecondary,
                        topic: top.name,
                      });
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all shrink-0 flex items-center gap-1.5 shadow-2xs group ${
                      isTopicActive
                        ? 'bg-black text-white font-semibold shadow-xs'
                        : 'bg-white border border-[#e5e5e5] text-[#444444] hover:border-black hover:text-black'
                    }`}
                    title={isTopicActive ? `Click to remove #${top.name}` : `Click to add #${top.name} to Filters`}
                  >
                    <span>#{top.name}</span>
                    <span className={`text-[9.5px] ${isTopicActive ? 'text-white/75' : 'text-[#888888]'}`}>{top.count}</span>
                    {isTopicActive ? (
                      <X className="w-2.5 h-2.5 text-white/80 group-hover:text-red-300" />
                    ) : (
                      <Plus className="w-2.5 h-2.5 text-[#888888] group-hover:text-black" />
                    )}
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
