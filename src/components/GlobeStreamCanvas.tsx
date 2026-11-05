import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { NoteItem, TaxonomyData } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  RotateCcw, 
  ChevronDown,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { NoteDetailPanel } from './NoteDetailPanel';

interface GlobeStreamCanvasProps {
  notes: NoteItem[];
  taxonomy: TaxonomyData;
  knownTitles?: Set<string>;
  onSwitchToStream: () => void;
  onNavigateWikilink?: (title: string) => void;
}

export const GlobeStreamCanvas: React.FC<GlobeStreamCanvasProps> = ({
  notes,
  taxonomy,
  knownTitles,
  onSwitchToStream,
  onNavigateWikilink,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Viewport dimensions (responsive initialization)
  const [dimensions, setDimensions] = useState(() => {
    if (typeof window !== 'undefined') {
      return { width: window.innerWidth, height: window.innerHeight };
    }
    return { width: 1440, height: 900 };
  });

  // Pan offset on virtual 2D/3D sphere
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panRef = useRef({ x: 0, y: 0 });
  panRef.current = pan;

  // Hierarchical Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  // Mobile Filter Sheet & Mobile Search Overlay states
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  // Active / Selected note for inflation modal
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);
  const [clickOrigin, setClickOrigin] = useState<{ x: number; y: number } | null>(null);

  // Drag interaction state
  const isDraggingRef = useRef(false);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const dragStartPanRef = useRef({ x: 0, y: 0 });
  const lastMovePosRef = useRef({ x: 0, y: 0, time: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);
  const totalDragDistanceRef = useRef(0);

  // Track window resize
  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const isMobile = dimensions.width < 768;

  // Filter notes hierarchically
  const filteredNotes = useMemo(() => {
    let result = notes;
    if (selectedCategory) {
      result = result.filter((n) => n.category === selectedCategory);
    }
    if (selectedSubCategory) {
      result = result.filter((n) => n.subCategory === selectedSubCategory);
    }
    if (selectedTopic) {
      result = result.filter(
        (n) => n.topic === selectedTopic || (n.topics && n.topics.includes(selectedTopic))
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          (n.topic && n.topic.toLowerCase().includes(q)) ||
          (n.tldr && n.tldr.toLowerCase().includes(q))
      );
    }
    return result;
  }, [notes, selectedCategory, selectedSubCategory, selectedTopic, searchQuery]);

  // Card grid geometry: Responsive to Desktop vs Mobile (matches reference video)
  const CARD_W = isMobile ? 104 : 168;
  const CARD_H = isMobile ? 104 : 168;
  const GAP = isMobile ? 10 : 14;
  const STEP_X = CARD_W + GAP; // 114px on mobile, 182px on desktop
  const STEP_Y = CARD_H + GAP; // 114px on mobile, 182px on desktop

  // Grid columns based on notes length
  const GRID_COLS = useMemo(() => {
    return Math.max(16, Math.ceil(Math.sqrt(Math.max(1, filteredNotes.length) * 1.5)));
  }, [filteredNotes.length]);

  const GRID_ROWS = useMemo(() => {
    return Math.max(16, Math.ceil(Math.max(1, filteredNotes.length) / GRID_COLS));
  }, [filteredNotes.length, GRID_COLS]);

  // Smooth Momentum glide physics on release
  const startMomentum = useCallback(() => {
    const friction = 0.93;
    const minVelocity = 0.2;

    const step = () => {
      velocityRef.current.x *= friction;
      velocityRef.current.y *= friction;

      if (
        Math.abs(velocityRef.current.x) > minVelocity ||
        Math.abs(velocityRef.current.y) > minVelocity
      ) {
        setPan((prev) => ({
          x: prev.x + velocityRef.current.x,
          y: prev.y + velocityRef.current.y,
        }));
        animationFrameRef.current = requestAnimationFrame(step);
      } else {
        velocityRef.current = { x: 0, y: 0 };
        animationFrameRef.current = null;
      }
    };

    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = requestAnimationFrame(step);
  }, []);

  // Mouse Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.interactive-control')) return;
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    isDraggingRef.current = true;
    totalDragDistanceRef.current = 0;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    dragStartPanRef.current = { ...panRef.current };
    lastMovePosRef.current = { x: e.clientX, y: e.clientY, time: performance.now() };
    velocityRef.current = { x: 0, y: 0 };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;

    const dx = e.clientX - dragStartPosRef.current.x;
    const dy = e.clientY - dragStartPosRef.current.y;
    totalDragDistanceRef.current += Math.hypot(e.movementX, e.movementY);

    const now = performance.now();
    const dt = Math.max(1, now - lastMovePosRef.current.time);
    velocityRef.current = {
      x: ((e.clientX - lastMovePosRef.current.x) / dt) * 14,
      y: ((e.clientY - lastMovePosRef.current.y) / dt) * 14,
    };
    lastMovePosRef.current = { x: e.clientX, y: e.clientY, time: now };

    setPan({
      x: dragStartPanRef.current.x + dx,
      y: dragStartPanRef.current.y + dy,
    });
  };

  const handleMouseUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    startMomentum();
  };

  // Touch Support
  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('.interactive-control')) return;
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    const touch = e.touches[0];
    isDraggingRef.current = true;
    totalDragDistanceRef.current = 0;
    dragStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    dragStartPanRef.current = { ...panRef.current };
    lastMovePosRef.current = { x: touch.clientX, y: touch.clientY, time: performance.now() };
    velocityRef.current = { x: 0, y: 0 };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - dragStartPosRef.current.x;
    const dy = touch.clientY - dragStartPosRef.current.y;
    totalDragDistanceRef.current += Math.hypot(
      touch.clientX - lastMovePosRef.current.x,
      touch.clientY - lastMovePosRef.current.y
    );

    const now = performance.now();
    const dt = Math.max(1, now - lastMovePosRef.current.time);
    velocityRef.current = {
      x: ((touch.clientX - lastMovePosRef.current.x) / dt) * 14,
      y: ((touch.clientY - lastMovePosRef.current.y) / dt) * 14,
    };
    lastMovePosRef.current = { x: touch.clientX, y: touch.clientY, time: now };

    setPan({
      x: dragStartPanRef.current.x + dx,
      y: dragStartPanRef.current.y + dy,
    });
  };

  const handleTouchEnd = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    startMomentum();
  };

  // Mouse Wheel Navigation
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    setPan((prev) => ({
      x: prev.x - e.deltaX * 0.9,
      y: prev.y - e.deltaY * 0.9,
    }));
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Escape') {
        setSelectedNote(null);
        return;
      }

      const step = 80;
      if (e.key === 'ArrowRight') setPan((p) => ({ ...p, x: p.x - step }));
      if (e.key === 'ArrowLeft') setPan((p) => ({ ...p, x: p.x + step }));
      if (e.key === 'ArrowDown') setPan((p) => ({ ...p, y: p.y - step }));
      if (e.key === 'ArrowUp') setPan((p) => ({ ...p, y: p.y + step }));
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Canvas dimensions (canvas sits strictly below the 57px header)
  const HEADER_H = 57;
  const canvasHeight = Math.max(400, dimensions.height - HEADER_H);
  const cx = dimensions.width / 2;
  const cy = canvasHeight / 2;

  // Sphere radius and curvature (responsive for mobile vs desktop)
  const sphereRadius = Math.max(dimensions.width, canvasHeight) * (isMobile ? 0.62 : 0.72);
  const kCurvature = isMobile ? 0.42 : 0.36;

  // Compute visible cards with 3D Spherical conformal projection
  const visibleCards = useMemo(() => {
    if (filteredNotes.length === 0) return [];

    const items: Array<{
      note: NoteItem;
      key: string;
      screenX: number;
      screenY: number;
      scale: number;
      opacity: number;
      rotX: number;
      rotY: number;
      zIndex: number;
    }> = [];

    const minCol = Math.floor((-pan.x - sphereRadius * 1.3) / STEP_X);
    const maxCol = Math.ceil((-pan.x + dimensions.width + sphereRadius * 1.3) / STEP_X);
    const minRow = Math.floor((-pan.y - sphereRadius * 1.3) / STEP_Y);
    const maxRow = Math.ceil((-pan.y + canvasHeight + sphereRadius * 1.3) / STEP_Y);

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const cardCenterX = c * STEP_X + pan.x + CARD_W / 2;
        const cardCenterY = r * STEP_Y + pan.y + CARD_H / 2;

        const dx = cardCenterX - cx;
        const dy = cardCenterY - cy;
        const dist = Math.hypot(dx, dy);

        // Cull cards outside sphere horizon
        if (dist > sphereRadius * 1.25) continue;

        const total = filteredNotes.length;
        const wrappedCol = ((c % GRID_COLS) + GRID_COLS) % GRID_COLS;
        const wrappedRow = ((r % GRID_ROWS) + GRID_ROWS) % GRID_ROWS;
        const noteIndex = (wrappedRow * GRID_COLS + wrappedCol) % total;
        const note = filteredNotes[noteIndex];
        if (!note) continue;

        // Spherical curvature compression factor
        const normDist = dist / sphereRadius;
        const rFactor = 1.0 / Math.sqrt(1.0 + kCurvature * Math.pow(normDist, 2));

        // Curvilinear spherical screen positions
        const curvedCenterX = cx + dx * rFactor;
        const curvedCenterY = cy + dy * rFactor;

        const screenX = Math.round(curvedCenterX - CARD_W / 2);
        const screenY = Math.round(curvedCenterY - CARD_H / 2);

        // Cull cards that have completely scrolled outside the visible screen buffer
        const edgeBuffer = isMobile ? 20 : 60;
        if (screenY + CARD_H < -edgeBuffer || screenY > canvasHeight + edgeBuffer) continue;
        if (screenX + CARD_W < -edgeBuffer || screenX > dimensions.width + edgeBuffer) continue;

        // Dynamic 3D Spherical Normal Rotation
        const rotY = Number(((dx / sphereRadius) * 40 * rFactor).toFixed(1));
        const rotX = Number((-(dy / sphereRadius) * 40 * rFactor).toFixed(1));

        // Organic scale tapering matching curvature derivative so cards never collide
        const minScale = isMobile ? 0.38 : 0.48;
        const scale = Number(Math.max(minScale, Math.pow(rFactor, 2.8)).toFixed(2));
        const opacity = Number(Math.max(0, Math.min(1, 1 - Math.pow(normDist / 1.15, 3.2))).toFixed(2));
        const zIndex = Math.round((1 - Math.min(1, normDist)) * 100);

        items.push({
          note,
          key: `${c}_${r}_${note.id}`,
          screenX,
          screenY,
          scale,
          opacity,
          rotX,
          rotY,
          zIndex,
        });
      }
    }

    return items;
  }, [
    filteredNotes,
    pan.x,
    pan.y,
    dimensions.width,
    canvasHeight,
    cx,
    cy,
    sphereRadius,
    GRID_COLS,
    GRID_ROWS,
    STEP_X,
    STEP_Y,
    isMobile,
  ]);

  // Handle card click
  const handleCardClick = (
    note: NoteItem,
    screenX: number,
    screenY: number,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    const dragDist = Math.hypot(
      e.clientX - dragStartPosRef.current.x,
      e.clientY - dragStartPosRef.current.y
    );
    if (dragDist > 12) return;

    setClickOrigin({
      x: screenX + CARD_W / 2,
      y: screenY + HEADER_H + CARD_H / 2,
    });
    setSelectedNote(note);
  };

  // Reset all filters and position
  const handleResetAll = () => {
    setSelectedCategory(null);
    setSelectedSubCategory(null);
    setSelectedTopic(null);
    setSearchQuery('');
    setPan({ x: 0, y: 0 });
  };

  // Categories list
  const categories = useMemo(() => {
    return Object.keys(taxonomy).sort((a, b) => (taxonomy[b]?.count || 0) - (taxonomy[a]?.count || 0));
  }, [taxonomy]);

  // Sub-categories of selected category
  const subCategories = useMemo(() => {
    if (!selectedCategory || !taxonomy[selectedCategory]) return [];
    const subs = taxonomy[selectedCategory].subCategories || {};
    return Object.keys(subs).sort((a, b) => (subs[b]?.count || 0) - (subs[a]?.count || 0));
  }, [selectedCategory, taxonomy]);

  // Topics of selected sub-category
  const topics = useMemo(() => {
    if (!selectedCategory || !selectedSubCategory || !taxonomy[selectedCategory]) return [];
    const topMap = taxonomy[selectedCategory].subCategories?.[selectedSubCategory]?.topics || {};
    return Object.keys(topMap).sort((a, b) => (topMap[b] || 0) - (topMap[a] || 0));
  }, [selectedCategory, selectedSubCategory, taxonomy]);

  const hasActiveFilter = Boolean(selectedCategory || selectedSubCategory || selectedTopic || searchQuery);

  return (
    <div className="w-full max-w-[100vw] h-screen flex flex-col bg-[#fbfbfb] text-black overflow-hidden select-none font-sans relative">
      {/* --- 1. TOP HEADER (Solid 100% Opaque, identical height to Stream mode, completely OUTSIDE 3D container!) --- */}
      <header className="interactive-control w-full max-w-[100vw] h-[57px] bg-white border-b border-[#eeeeee] px-3 sm:px-6 md:px-8 flex items-center justify-between z-50 shrink-0 select-none shadow-2xs box-border">
        {/* Left: Brand & Mode Switcher */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={handleResetAll}
            className="font-black text-lg sm:text-2xl tracking-tight text-black font-sans hover:opacity-75 transition-opacity"
          >
            XP Seoul
          </button>

          {/* Mode Switcher Pill */}
          <div className="flex items-center bg-[#f4f4f5] p-0.5 sm:p-1 rounded-full border border-black/8 font-sans text-[11px] sm:text-xs ml-1 sm:ml-2">
            <button
              onClick={onSwitchToStream}
              className="px-2 sm:px-3 py-1 rounded-full text-[#666666] hover:text-black transition-colors"
            >
              Stream
            </button>
            <button className="px-2.5 sm:px-3.5 py-1 rounded-full bg-white text-black font-semibold shadow-2xs">
              Globe
            </button>
          </div>
        </div>

        {/* Center: Search Bar (Desktop only) */}
        <div className="hidden md:flex relative flex-1 max-w-sm mx-4">
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#888888]" />
          <input
            type="text"
            placeholder="Search notes on globe..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-full bg-[#f4f4f5] border border-black/8 text-xs text-black placeholder-[#888888] focus:outline-hidden focus:bg-white focus:border-black/25 transition-all font-sans"
          />
        </div>

        {/* Right: Visible Count (Desktop only) */}
        <div className="hidden md:flex items-center gap-3 shrink-0 font-sans">
          <span className="font-mono text-[11px] text-[#888888]">
            Archive · <span className="font-semibold text-black">{filteredNotes.length.toLocaleString()}</span>
          </span>
        </div>

        {/* Right: Search & Filter Trigger Buttons (Mobile only) */}
        <div className="flex md:hidden items-center gap-2 shrink-0">
          {/* Mobile Search Toggle */}
          <button
            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
              isMobileSearchOpen || searchQuery
                ? 'bg-black text-white border-black'
                : 'bg-[#f4f4f5] text-[#555555] border-black/8 hover:text-black'
            }`}
            aria-label="Toggle search"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          {/* Mobile Filter Sheet Button (circular icon button matching reference) */}
          <button
            onClick={() => setIsMobileFilterOpen(true)}
            className={`relative w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
              hasActiveFilter
                ? 'bg-black text-white border-black shadow-xs'
                : 'bg-[#f4f4f5] text-[#333333] border-black/8 hover:text-black'
            }`}
            aria-label="Open filter"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {hasActiveFilter && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-black border-2 border-white" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Search Dropdown Bar */}
      <AnimatePresence>
        {isMobile && isMobileSearchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden z-40 bg-white border-b border-[#eeeeee] px-4 py-2 flex items-center gap-2 overflow-hidden shrink-0 shadow-2xs"
          >
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#888888]" />
              <input
                type="text"
                autoFocus
                placeholder="Search notes on globe..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 rounded-full bg-[#f4f4f5] border border-black/8 text-xs text-black placeholder-[#888888] focus:outline-hidden font-sans"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#888888] hover:text-black"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <button
              onClick={() => setIsMobileSearchOpen(false)}
              className="text-xs font-sans text-[#666666] shrink-0 px-1"
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- 2. MAIN 3D GLOBE CANVAS (Strictly below the header, overflow hidden) --- */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        className="flex-1 w-full max-w-[100vw] h-full relative overflow-hidden cursor-grab active:cursor-grabbing touch-none"
        style={{ perspective: '1200px', touchAction: 'none', contain: 'paint' }}
      >
        {/* --- DESKTOP ONLY: RIGHT TOP FLOATING FILTER BUTTONS --- */}
        <div className="hidden md:flex interactive-control fixed top-[72px] right-6 z-40 flex-col items-end gap-1.5 select-none font-sans max-h-[82vh] overflow-y-auto no-scrollbar pb-6">
            {/* 1. Reset Button attached right at the top of the filters */}
            <button
              onClick={handleResetAll}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full shadow-xs border transition-all text-xs font-sans font-medium active:scale-95 mb-0.5 ${
                hasActiveFilter
                  ? 'bg-black text-white border-black shadow-md'
                  : 'bg-white/90 backdrop-blur-md text-[#555555] border-black/8 hover:text-black hover:bg-white'
              }`}
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>

            {/* 2. All Notes Pill */}
            <button
              onClick={() => {
                setSelectedCategory(null);
                setSelectedSubCategory(null);
                setSelectedTopic(null);
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all shadow-xs border text-right ${
                !selectedCategory
                  ? 'bg-black text-white border-black font-semibold shadow-md'
                  : 'bg-white/90 backdrop-blur-md text-[#333333] border-black/8 hover:bg-black hover:text-white'
              }`}
            >
              All ({notes.length})
            </button>

            {/* 3. Level 1: Categories */}
            {categories.map((cat) => {
              const isCatSelected = selectedCategory === cat;
              return (
                <div key={cat} className="flex flex-col items-end gap-1 w-full">
                  {/* Category Pill Button */}
                  <button
                    onClick={() => {
                      if (isCatSelected) {
                        setSelectedCategory(null);
                        setSelectedSubCategory(null);
                        setSelectedTopic(null);
                      } else {
                        setSelectedCategory(cat);
                        setSelectedSubCategory(null);
                        setSelectedTopic(null);
                      }
                    }}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all shadow-xs border flex items-center justify-end gap-1.5 ${
                      isCatSelected
                        ? 'bg-black text-white border-black font-semibold shadow-md'
                        : 'bg-white/90 backdrop-blur-md text-[#333333] border-black/8 hover:bg-black hover:text-white'
                    }`}
                  >
                    <span>{cat}</span>
                    {isCatSelected && <ChevronDown className="w-3 h-3 text-white" />}
                  </button>

                  {/* Level 2: Sub-Categories */}
                  <AnimatePresence>
                    {isCatSelected && subCategories.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex flex-col items-end gap-1 pr-1.5 my-0.5 overflow-hidden"
                      >
                        {subCategories.slice(0, 10).map((sub) => {
                          const isSubSelected = selectedSubCategory === sub;
                          return (
                            <div key={sub} className="flex flex-col items-end gap-1 w-full">
                              <button
                                onClick={() => {
                                  if (isSubSelected) {
                                    setSelectedSubCategory(null);
                                    setSelectedTopic(null);
                                  } else {
                                    setSelectedSubCategory(sub);
                                    setSelectedTopic(null);
                                  }
                                }}
                                className={`px-3 py-1 rounded-full text-[11px] font-sans font-medium transition-all shadow-2xs border ${
                                  isSubSelected
                                    ? 'bg-[#222222] text-white border-[#222222]'
                                    : 'bg-white/85 backdrop-blur-md text-[#444444] border-black/8 hover:bg-black hover:text-white'
                                }`}
                              >
                                ↳ {sub}
                              </button>

                              {/* Level 3: Topics */}
                              <AnimatePresence>
                                {isSubSelected && topics.length > 0 && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="flex flex-col items-end gap-1 pr-1.5 my-0.5 overflow-hidden"
                                  >
                                    {topics.slice(0, 8).map((top) => {
                                      const isTopSelected = selectedTopic === top;
                                      return (
                                        <button
                                          key={top}
                                          onClick={() => setSelectedTopic(isTopSelected ? null : top)}
                                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono transition-all border ${
                                            isTopSelected
                                              ? 'bg-black text-white border-black font-semibold'
                                              : 'bg-white/85 backdrop-blur-md text-[#555555] border-black/8 hover:border-black/30 hover:text-black'
                                          }`}
                                        >
                                          • {top}
                                        </button>
                                      );
                                    })}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

        {/* --- BOTTOM FLOATING HELPER HINT --- */}
        <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/90 backdrop-blur-md border border-black/8 text-[10.5px] sm:text-[11px] font-sans text-[#666666] flex items-center gap-1.5 sm:gap-2 shadow-[0_6px_20px_rgba(0,0,0,0.06)] whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-black/60 shrink-0" />
          <span>{isMobile ? 'Drag in any direction · Tap note to expand' : 'Drag freely in all directions · Click note to inflate'}</span>
        </div>

        {/* --- 3D GLOBE CARDS LAYER (Uniform Spacing, Zero Overlap, Razor-sharp Text) --- */}
        <div
          className={`absolute inset-0 transition-opacity duration-300 ${
            selectedNote ? 'opacity-20 pointer-events-none' : 'pointer-events-none'
          }`}
        >
          {visibleCards.map((item) => {
            const tldrText = item.note.tldr || item.note.summary || item.note.info || item.note.category;

            return (
              <div
                key={item.key}
                onClick={(e) => handleCardClick(item.note, item.screenX, item.screenY, e)}
                style={{
                  position: 'absolute',
                  width: `${CARD_W}px`,
                  height: `${CARD_H}px`,
                  left: 0,
                  top: 0,
                  transform: `translate3d(${item.screenX}px, ${item.screenY}px, 0px) rotateX(${item.rotX}deg) rotateY(${item.rotY}deg) scale(${item.scale})`,
                  opacity: item.opacity,
                  zIndex: item.zIndex,
                  pointerEvents: item.opacity > 0.2 ? 'auto' : 'none',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                }}
                className="group cursor-pointer select-none"
              >
                {/* Opaque white card for 100% razor sharp text rendering */}
                <div
                  style={{
                    borderRadius: isMobile ? '18px' : '24px',
                    WebkitFontSmoothing: 'antialiased',
                    MozOsxFontSmoothing: 'grayscale',
                    textRendering: 'optimizeLegibility',
                  }}
                  className={`w-full h-full flex flex-col items-start bg-white border border-black/8 shadow-[0_4px_16px_rgba(0,0,0,0.06),0_1px_4px_rgba(0,0,0,0.03)] transition-all duration-200 group-hover:border-black/25 group-hover:shadow-[0_10px_28px_rgba(0,0,0,0.12)] relative overflow-hidden ${
                    isMobile ? 'p-2.5 gap-1.5' : 'p-3.5 gap-[8px]'
                  }`}
                >
                  {/* 1. Title */}
                  <h3 className={`font-sans font-bold text-black tracking-[-0.03em] leading-tight line-clamp-1 w-full shrink-0 antialiased ${
                    isMobile ? 'text-[12px]' : 'text-[15.5px]'
                  }`}>
                    {item.note.title}
                  </h3>

                  {/* 2. Topic Badge */}
                  <div className="bg-[#1e1e1e] flex items-center justify-center px-1.5 py-0.5 rounded-[3px] shrink-0 max-w-full truncate">
                    <p className={`font-mono text-[#ececec] tracking-tight uppercase whitespace-nowrap truncate font-medium antialiased ${
                      isMobile ? 'text-[8px]' : 'text-[9.5px]'
                    }`}>
                      {item.note.topic || item.note.category}
                    </p>
                  </div>

                  {/* 3. tl;dr / Summary */}
                  <p className={`text-[#444444] font-sans tracking-tight w-full antialiased ${
                    isMobile ? 'text-[8.5px] leading-[12px] line-clamp-2' : 'text-[10px] leading-[15px] line-clamp-3'
                  }`}>
                    {tldrText}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- MOBILE FILTER BOTTOM SHEET --- */}
      <AnimatePresence>
        {isMobile && isMobileFilterOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex flex-col justify-end"
            onClick={() => setIsMobileFilterOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-h-[75vh] bg-white rounded-t-[28px] shadow-2xl border-t border-black/10 flex flex-col overflow-hidden pb-8"
            >
              {/* Sheet Header */}
              <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-[#eeeeee]">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-black" />
                  <span className="font-sans font-bold text-base text-black">Filter Archive</span>
                  <span className="text-xs text-[#888888] font-mono">({filteredNotes.length.toLocaleString()})</span>
                </div>

                <div className="flex items-center gap-2">
                  {hasActiveFilter && (
                    <button
                      onClick={handleResetAll}
                      className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#f4f4f5] text-xs font-sans font-medium text-[#555555] hover:text-black"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}
                  <button
                    onClick={() => setIsMobileFilterOpen(false)}
                    className="p-1.5 rounded-full hover:bg-black/5 text-[#666666]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sheet Content: Hierarchical Filter Buttons */}
              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-2">
                {/* All Button */}
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setSelectedSubCategory(null);
                    setSelectedTopic(null);
                  }}
                  className={`w-full py-2.5 px-4 rounded-full text-xs font-medium transition-all text-left flex items-center justify-between border ${
                    !selectedCategory
                      ? 'bg-black text-white border-black font-semibold shadow-xs'
                      : 'bg-white text-[#333333] border-black/8 hover:bg-[#f5f5f5]'
                  }`}
                >
                  <span>All Notes</span>
                  <span className="text-[11px] font-mono opacity-80">{notes.length}</span>
                </button>

                {/* Categories */}
                {categories.map((cat) => {
                  const isCatSelected = selectedCategory === cat;
                  const count = taxonomy[cat]?.count || 0;
                  return (
                    <div key={cat} className="flex flex-col gap-1.5 w-full">
                      <button
                        onClick={() => {
                          if (isCatSelected) {
                            setSelectedCategory(null);
                            setSelectedSubCategory(null);
                            setSelectedTopic(null);
                          } else {
                            setSelectedCategory(cat);
                            setSelectedSubCategory(null);
                            setSelectedTopic(null);
                          }
                        }}
                        className={`w-full py-2.5 px-4 rounded-full text-xs font-medium transition-all text-left flex items-center justify-between border ${
                          isCatSelected
                            ? 'bg-black text-white border-black font-semibold shadow-xs'
                            : 'bg-white text-[#333333] border-black/8 hover:bg-[#f5f5f5]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{cat}</span>
                          {isCatSelected && <ChevronDown className="w-3.5 h-3.5" />}
                        </div>
                        <span className="text-[11px] font-mono opacity-80">{count}</span>
                      </button>

                      {/* Sub-categories */}
                      {isCatSelected && subCategories.length > 0 && (
                        <div className="pl-3 flex flex-col gap-1.5 py-1">
                          {subCategories.slice(0, 12).map((sub) => {
                            const isSubSelected = selectedSubCategory === sub;
                            return (
                              <div key={sub} className="flex flex-col gap-1">
                                <button
                                  onClick={() => {
                                    if (isSubSelected) {
                                      setSelectedSubCategory(null);
                                      setSelectedTopic(null);
                                    } else {
                                      setSelectedSubCategory(sub);
                                      setSelectedTopic(null);
                                    }
                                  }}
                                  className={`w-full py-2 px-3.5 rounded-full text-[11px] font-medium text-left transition-all border ${
                                    isSubSelected
                                      ? 'bg-[#222222] text-white border-[#222222]'
                                      : 'bg-[#f8f8f9] text-[#444444] border-black/6'
                                  }`}
                                >
                                  ↳ {sub}
                                </button>

                                {/* Topics */}
                                {isSubSelected && topics.length > 0 && (
                                  <div className="pl-3 flex flex-wrap gap-1.5 py-1">
                                    {topics.slice(0, 10).map((top) => {
                                      const isTopSelected = selectedTopic === top;
                                      return (
                                        <button
                                          key={top}
                                          onClick={() => setSelectedTopic(isTopSelected ? null : top)}
                                          className={`px-3 py-1 rounded-full text-[10px] font-mono transition-all border ${
                                            isTopSelected
                                              ? 'bg-black text-white border-black font-semibold'
                                              : 'bg-white text-[#555555] border-black/8'
                                          }`}
                                        >
                                          # {top}
                                        </button>
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

              {/* Done Button */}
              <div className="px-6 pt-3">
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="w-full py-3 bg-black text-white rounded-full font-sans font-semibold text-xs shadow-md active:scale-98 transition-transform"
                >
                  Show {filteredNotes.length.toLocaleString()} Notes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- INFLATING NOTE DETAIL EXPANSION (부풀어오르는 인터랙션 애니메이션) --- */}
      <AnimatePresence>
        {selectedNote && (
          <div className={`fixed inset-0 z-[100] flex items-center justify-center ${
            isMobile ? 'p-0' : 'p-4 sm:p-6 md:p-8'
          }`}>
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setSelectedNote(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-2xl"
            />

            {/* Inflating / Blooming Note Modal */}
            <motion.div
              initial={{
                scale: 0.22,
                opacity: 0,
                x: clickOrigin ? clickOrigin.x - cx : 0,
                y: clickOrigin ? clickOrigin.y - (cy + HEADER_H) : 0,
                borderRadius: isMobile ? 18 : 24,
              }}
              animate={{
                scale: 1,
                opacity: 1,
                x: 0,
                y: 0,
                borderRadius: isMobile ? 0 : 28,
              }}
              exit={{
                scale: 0.22,
                opacity: 0,
                x: clickOrigin ? clickOrigin.x - cx : 0,
                y: clickOrigin ? clickOrigin.y - (cy + HEADER_H) : 0,
                borderRadius: isMobile ? 18 : 24,
              }}
              transition={{
                type: 'spring',
                damping: 26,
                stiffness: 260,
                mass: 0.85,
              }}
              className={`relative w-full bg-white text-black shadow-[0_25px_80px_rgba(0,0,0,0.45)] border border-black/10 overflow-hidden flex flex-col z-10 ${
                isMobile
                  ? 'h-full max-h-none rounded-none'
                  : 'max-w-[1080px] h-[90vh] max-h-[920px] rounded-[28px]'
              }`}
              style={{ willChange: 'transform, opacity' }}
            >
              <NoteDetailPanel
                note={selectedNote}
                knownTitles={knownTitles}
                onClose={() => setSelectedNote(null)}
                onNavigateWikilink={(target) => {
                  if (onNavigateWikilink) {
                    onNavigateWikilink(target);
                  }
                  const found = notes.find(
                    (n) =>
                      n.title.toLowerCase() === target.toLowerCase() ||
                      n.id.toLowerCase() === target.toLowerCase()
                  );
                  if (found) {
                    setSelectedNote(found);
                  }
                }}
                isMobile={isMobile}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
