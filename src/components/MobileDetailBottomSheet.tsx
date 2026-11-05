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

  const commitSlot = (options: { primary?: string | null; secondary?: string | null; topic?: string | null }) => {
    if (activeFilterSlots.length >= 20) return;
    const p = options.primary ?? draftPrimary;
    const s = options.secondary ?? null;
    const t = options.topic ?? null;
    if (!p && !s && !t) return;

    const label = t || s || p || '';
    onAddFilterSlot({
      id: `m-slot-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      axis: currentAxis,
      label,
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
          className="relative w-full max-h-[82vh] h-[580px] bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden z-10"
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
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 font-sans pb-8">
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
                      const isSelected = draftPrimary === item.name;
                      const hasSubsOrTopics = Boolean(
                        (currentAxis === 'category' && (Object.keys(facetData.byCategory?.[item.name]?.subs || {}).length > 0 || Object.keys(facetData.byCategory?.[item.name]?.topics || {}).length > 0)) ||
                        (currentAxis === 'type' && (Object.keys(facetData.byType?.[item.name]?.subs || {}).length > 0 || Object.keys(facetData.byType?.[item.name]?.topics || {}).length > 0)) ||
                        (currentAxis === 'field' && (Object.keys(facetData.byField?.[item.name]?.subs || {}).length > 0 || Object.keys(facetData.byField?.[item.name]?.topics || {}).length > 0)) ||
                        (currentAxis === 'region' && (Object.keys(facetData.byRegion?.[item.name]?.subs || {}).length > 0 || Object.keys(facetData.byRegion?.[item.name]?.topics || {}).length > 0))
                      );

                      return (
                        <button
                          key={item.name}
                          onClick={() => {
                            if (hasSubsOrTopics) {
                              if (isSelected) {
                                setDraftPrimary(null);
                              } else {
                                setDraftPrimary(item.name);
                              }
                            } else {
                              commitSlot({ primary: item.name });
                            }
                          }}
                          className={`py-2 px-3 rounded-xl text-xs font-medium transition-all text-left flex items-center justify-between border ${
                            isSelected
                              ? 'bg-black text-white border-black font-semibold shadow-xs'
                              : 'bg-white text-[#333333] border-black/8 hover:bg-[#f8f8f9]'
                          }`}
                        >
                          <span className="truncate">{item.name}</span>
                          <span className={`text-[10px] font-mono ml-1 ${isSelected ? 'text-white/80' : 'text-[#888888]'}`}>{item.count}</span>
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
                      {secondaryList.map((sub) => (
                        <button
                          key={sub.name}
                          onClick={() => commitSlot({ primary: draftPrimary, secondary: sub.name })}
                          className="py-1.5 px-3 rounded-lg text-xs font-medium bg-[#f6f6f8] text-[#333333] hover:bg-black hover:text-white transition-colors border border-black/5 flex items-center gap-1"
                        >
                          <span>{sub.name}</span>
                          <span className="text-[10px] text-[#888888]">({sub.count})</span>
                          <Plus className="w-3 h-3 ml-0.5" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Topics (if primary selected) */}
                {draftPrimary && contextualTopics.length > 0 && (
                  <div className="flex flex-col gap-1.5 pt-2 border-t border-[#f0f0f0]">
                    <span className="text-[11px] font-mono text-[#888888] uppercase tracking-wider">
                      Related Topics:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {contextualTopics.slice(0, 20).map((top) => (
                        <button
                          key={top.name}
                          onClick={() => commitSlot({ primary: draftPrimary, topic: top.name })}
                          className="py-1 px-2.5 rounded-full text-[11px] font-mono bg-white border border-black/15 text-[#333333] hover:border-black hover:bg-black hover:text-white transition-all flex items-center gap-1"
                        >
                          <span>#{top.name}</span>
                          <span className="text-[9px] text-[#888888]">({top.count})</span>
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      ))}
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
