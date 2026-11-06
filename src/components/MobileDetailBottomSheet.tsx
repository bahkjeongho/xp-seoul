import React, { useState, useMemo } from 'react';
import type { NoteItem } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { History, SlidersHorizontal, X, RotateCcw, Plus, ChevronRight, Shuffle } from 'lucide-react';
import { HistoryLensStream } from './HistoryLensStream';
import type { FacetTaxonomyData } from './TopFilterBarFacet';
import type { ActiveFilterSlot, SortOrder } from './MultiFacetFilterBar';

interface MobileDetailBottomSheetProps {
  isOpen: boolean;
  activeTab: 'history' | 'filter';
  onChangeTab?: (tab: 'history' | 'filter') => void;
  onClose: () => void;
  historyNotes: NoteItem[];
  selectedNote: NoteItem | null;
  notes: NoteItem[];
  facetData: FacetTaxonomyData;
  activeFilterSlots: ActiveFilterSlot[];
  onAddFilterSlot: (slot: ActiveFilterSlot) => void;
  onRemoveFilterSlot: (id: string) => void;
  onClearAllSlots: () => void;
  sortOrder?: SortOrder;
  onSortOrderChange?: (order: SortOrder) => void;
  onReshuffle?: () => void;
  onSelectNote: (note: NoteItem) => void;
}

export const MobileDetailBottomSheet: React.FC<MobileDetailBottomSheetProps> = ({
  isOpen,
  activeTab,
  onClose,
  historyNotes,
  selectedNote,
  notes,
  facetData,
  activeFilterSlots,
  onAddFilterSlot,
  onRemoveFilterSlot,
  onClearAllSlots,
  sortOrder = 'random',
  onSortOrderChange,
  onReshuffle,
  onSelectNote,
}) => {
  if (!isOpen) return null;

  const [currentAxis, setCurrentAxis] = useState<'category' | 'type' | 'field' | 'region'>('category');
  const [draftPrimary, setDraftPrimary] = useState<string | null>(null);

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

  // Secondary list
  const secondaryList = useMemo(() => {
    if (!draftPrimary) return [];
    if (currentAxis === 'category') {
      return Object.entries(facetData.byCategory?.[draftPrimary]?.subs || {})
        .sort((a, b) => b[1].count - a[1].count)
        .map(([name, data]) => ({ name, count: data.count }));
    }
    if (currentAxis === 'type') {
      return Object.entries(facetData.byType?.[draftPrimary]?.subs || {})
        .sort((a, b) => b[1].count - a[1].count)
        .map(([name, data]) => ({ name, count: data.count }));
    }
    if (currentAxis === 'field') {
      return Object.entries(facetData.byField?.[draftPrimary]?.subs || {})
        .sort((a, b) => b[1].count - a[1].count)
        .map(([name, data]) => ({ name, count: data.count }));
    }
    if (currentAxis === 'region') {
      return Object.entries(facetData.byRegion?.[draftPrimary]?.subs || {})
        .sort((a, b) => b[1].count - a[1].count)
        .map(([name, data]) => ({ name, count: data.count }));
    }
    return [];
  }, [currentAxis, draftPrimary, facetData]);

  // Topics list
  const contextualTopics = useMemo(() => {
    let topicMap: Record<string, number> = {};
    if (currentAxis === 'category' && draftPrimary) {
      topicMap = facetData.byCategory?.[draftPrimary]?.topics || {};
    } else if (currentAxis === 'type' && draftPrimary) {
      topicMap = facetData.byType?.[draftPrimary]?.topics || {};
    } else if (currentAxis === 'field' && draftPrimary) {
      topicMap = facetData.byField?.[draftPrimary]?.topics || {};
    } else if (currentAxis === 'region' && draftPrimary) {
      topicMap = facetData.byRegion?.[draftPrimary]?.topics || {};
    }
    return Object.entries(topicMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [currentAxis, draftPrimary, facetData]);

  const toggleOrAddSlot = (options: {
    primary?: string | null;
    secondary?: string | null;
    topic?: string | null;
  }) => {
    const p = options.primary ?? draftPrimary;
    const s = options.secondary ?? null;
    const t = options.topic ?? null;
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

    // 1. TOPIC
    if (t) {
      const existing = activeFilterSlots.find((slot) => isUnderSecondary(slot) && slot.topic === t);
      if (existing) {
        onRemoveFilterSlot(existing.id);
        const remainingTopics = activeFilterSlots.filter(
          (slot) => slot.id !== existing.id && isUnderSecondary(slot) && Boolean(slot.topic)
        );
        if (remainingTopics.length === 0 && s) {
          onAddFilterSlot({
            id: `m-slot-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
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

      if (activeFilterSlots.length >= 20) return;
      const pureSec = activeFilterSlots.find(isPureSecondary);
      if (pureSec) onRemoveFilterSlot(pureSec.id);
      const purePrim = activeFilterSlots.find(isPurePrimary);
      if (purePrim) onRemoveFilterSlot(purePrim.id);

      onAddFilterSlot({
        id: `m-slot-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
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

    // 2. SECONDARY (SUB)
    if (s) {
      const existing = activeFilterSlots.find(isPureSecondary);
      if (existing) {
        onRemoveFilterSlot(existing.id);
        const remainingUnderPrimary = activeFilterSlots.filter(
          (slot) => slot.id !== existing.id && isUnderPrimary(slot)
        );
        if (remainingUnderPrimary.length === 0 && p) {
          onAddFilterSlot({
            id: `m-slot-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
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

      if (activeFilterSlots.length >= 20) return;
      const purePrim = activeFilterSlots.find(isPurePrimary);
      if (purePrim) onRemoveFilterSlot(purePrim.id);

      onAddFilterSlot({
        id: `m-slot-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
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

    // 3. PRIMARY
    if (p) {
      const slotsUnder = activeFilterSlots.filter(isUnderPrimary);
      if (slotsUnder.length > 0) {
        slotsUnder.forEach((sl) => onRemoveFilterSlot(sl.id));
        return;
      }

      if (activeFilterSlots.length >= 20) return;
      onAddFilterSlot({
        id: `m-slot-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
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
          className="interactive-control relative w-full max-h-[85vh] h-[600px] bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden z-10"
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          {/* Top Drag Handle Bar */}
          <div className="w-full pt-3 pb-1 flex justify-center cursor-pointer" onClick={onClose}>
            <div className="w-10 h-1 bg-[#d5d5d8] rounded-full" />
          </div>

          {/* Clean Dedicated Header */}
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
                <span className="font-bold text-sm text-black">Filters</span>
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
              <div
                className="flex-1 overflow-y-auto overscroll-contain p-4 flex flex-col gap-3 font-sans pb-8"
                style={{ touchAction: 'pan-y' }}
              >
                {/* 1. Active Stack Row */}
                <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-[#f8f8fa] border border-black/8">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#777777] font-semibold">
                      Filters
                    </span>
                    {activeFilterSlots.length > 0 && (
                      <button
                        onClick={onClearAllSlots}
                        className="flex items-center gap-1 text-[11px] text-[#888888] hover:text-black font-mono"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Clear All</span>
                      </button>
                    )}
                  </div>

                  {activeFilterSlots.length === 0 ? (
                    <span className="text-xs font-mono text-[#999999] py-1 italic">
                      No filters applied. Showing all notes.
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {activeFilterSlots.map((slot) => {
                        const badgeLetter =
                          slot.axis === 'category'
                            ? 'C'
                            : slot.axis === 'field'
                            ? 'F'
                            : slot.axis === 'region'
                            ? 'R'
                            : 'T';
                        return (
                          <span
                            key={slot.id}
                            className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-0.5 rounded-full bg-black text-white text-[11px] font-mono shadow-xs"
                          >
                            <span className="w-3.5 h-3.5 rounded-[3px] bg-white text-black flex items-center justify-center text-[9px] font-bold">
                              {badgeLetter}
                            </span>
                            <span className="text-white/40 font-light select-none">|</span>
                            <span className="max-w-[140px] truncate">{slot.label}</span>
                            <button
                              onClick={() => onRemoveFilterSlot(slot.id)}
                              className="hover:text-red-300 p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. Sort Order Segmented Selector */}
                {onSortOrderChange && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#f8f8fa] border border-black/8 font-mono text-xs">
                    <span className="text-[11px] uppercase tracking-wider text-[#777777] font-semibold">
                      Sort
                    </span>
                    <div className="flex items-center bg-white p-0.5 rounded-lg border border-black/10">
                      <button
                        onClick={() => {
                          if (sortOrder === 'random') {
                            onReshuffle?.();
                          } else {
                            onSortOrderChange('random');
                          }
                        }}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1 ${
                          sortOrder === 'random'
                            ? 'bg-black text-white shadow-xs font-semibold'
                            : 'text-[#666666]'
                        }`}
                      >
                        <Shuffle className="w-2.5 h-2.5" />
                        <span>Random</span>
                      </button>
                      <button
                        onClick={() => onSortOrderChange('asc')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                          sortOrder === 'asc'
                            ? 'bg-black text-white shadow-xs font-semibold'
                            : 'text-[#666666]'
                        }`}
                      >
                        A → Z
                      </button>
                      <button
                        onClick={() => onSortOrderChange('desc')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                          sortOrder === 'desc'
                            ? 'bg-black text-white shadow-xs font-semibold'
                            : 'text-[#666666]'
                        }`}
                      >
                        Z → A
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. Axis Switcher: Category | Type | Field | Region */}
                <div className="flex items-center gap-1.5 p-1 bg-[#f4f4f6] rounded-xl">
                  {(['category', 'type', 'field', 'region'] as const).map((axis) => {
                    const isSelected = currentAxis === axis;
                    const label =
                      axis === 'category'
                        ? 'Category'
                        : axis === 'type'
                        ? 'Type'
                        : axis === 'field'
                        ? 'Field'
                        : 'Region';
                    return (
                      <button
                        key={axis}
                        onClick={() => {
                          setCurrentAxis(axis);
                          setDraftPrimary(null);
                        }}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-white text-black font-semibold shadow-xs'
                            : 'text-[#666666] hover:text-black'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* 4. Primary Items Grid */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-mono text-[#888888] uppercase tracking-wider">
                    Select {currentAxis === 'category' ? 'Category' : currentAxis === 'type' ? 'Type' : currentAxis === 'field' ? 'Field' : 'Country'}:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {primaryList.map((item) => {
                      const isExpanded = draftPrimary === item.name;
                      const isPrimaryInSlots = activeFilterSlots.some((s) => {
                        if (s.axis !== currentAxis) return false;
                        if (currentAxis === 'category') return s.category === item.name && !s.subCategory && !s.topic;
                        if (currentAxis === 'type') return s.type === item.name && !s.subType && !s.topic;
                        if (currentAxis === 'field') return s.field === item.name && !s.subField && !s.topic;
                        if (currentAxis === 'region') return s.country === item.name && !s.city && !s.topic;
                        return false;
                      });

                      return (
                        <button
                          key={item.name}
                          onClick={() => {
                            toggleOrAddSlot({ primary: item.name });
                            if (isExpanded) {
                              setDraftPrimary(null);
                            } else {
                              setDraftPrimary(item.name);
                            }
                          }}
                          className={`py-2 px-3 rounded-xl text-xs font-medium transition-all text-left flex items-center justify-between border ${
                            isPrimaryInSlots
                              ? 'bg-black text-white border-black font-semibold shadow-xs'
                              : isExpanded
                              ? 'bg-[#222222] text-white border-[#222222]'
                              : 'bg-white text-[#333333] border-black/8 hover:bg-[#f8f8f9]'
                          }`}
                        >
                          <span className="truncate">{item.name}</span>
                          <span className={`text-[10px] font-mono ml-1 ${isPrimaryInSlots || isExpanded ? 'text-white/80' : 'text-[#888888]'}`}>{item.count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Sub-Categories / Sub-Types / Sub-Fields / Cities (if primary selected) */}
                {draftPrimary && secondaryList.length > 0 && (
                  <div className="flex flex-col gap-1.5 pt-2 border-t border-[#f0f0f0]">
                    <span className="text-[11px] font-mono text-[#888888] uppercase tracking-wider">
                      {currentAxis === 'region' ? 'Cities' : 'Sub-items'} ({draftPrimary}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {secondaryList.map((sub) => {
                        const isSubInSlots = activeFilterSlots.some((s) => {
                          if (s.axis !== currentAxis) return false;
                          if (currentAxis === 'category') return s.subCategory === sub.name && !s.topic;
                          if (currentAxis === 'type') return s.subType === sub.name && !s.topic;
                          if (currentAxis === 'field') return s.subField === sub.name && !s.topic;
                          if (currentAxis === 'region') return s.city === sub.name && !s.topic;
                          return false;
                        });

                        return (
                          <button
                            key={sub.name}
                            onClick={() => toggleOrAddSlot({ primary: draftPrimary, secondary: sub.name })}
                            className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-colors border flex items-center gap-1 ${
                              isSubInSlots
                                ? 'bg-black text-white border-black font-semibold shadow-xs'
                                : 'bg-[#f6f6f8] text-[#333333] border-black/5 hover:bg-black hover:text-white'
                            }`}
                          >
                            <span>{sub.name}</span>
                            <span className={`text-[10px] ${isSubInSlots ? 'text-white/80' : 'text-[#888888]'}`}>({sub.count})</span>
                            {isSubInSlots ? <X className="w-3 h-3 ml-0.5" /> : <Plus className="w-3 h-3 ml-0.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 6. Topics (if primary selected) */}
                {draftPrimary && contextualTopics.length > 0 && (
                  <div className="flex flex-col gap-1.5 pt-2 border-t border-[#f0f0f0]">
                    <span className="text-[11px] font-mono text-[#888888] uppercase tracking-wider">
                      Related Topics:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {contextualTopics.slice(0, 30).map((top) => {
                        const isTopInSlots = activeFilterSlots.some((s) => s.axis === currentAxis && s.topic === top.name);
                        return (
                          <button
                            key={top.name}
                            onClick={() => toggleOrAddSlot({ primary: draftPrimary, topic: top.name })}
                            className={`py-1 px-2.5 rounded-full text-[11px] font-mono transition-all flex items-center gap-1 border ${
                              isTopInSlots
                                ? 'bg-black text-white border-black font-bold shadow-xs'
                                : 'bg-white border-black/15 text-[#333333] hover:border-black hover:bg-black hover:text-white'
                            }`}
                          >
                            <span>#{top.name}</span>
                            <span className={`text-[9px] ${isTopInSlots ? 'text-white/80' : 'text-[#888888]'}`}>({top.count})</span>
                            {isTopInSlots ? <X className="w-2.5 h-2.5" /> : <Plus className="w-2.5 h-2.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
