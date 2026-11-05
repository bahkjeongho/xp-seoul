import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { NoteItem, TaxonomyData } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  RotateCcw, 
  ChevronDown
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

  // Viewport dimensions
  const [dimensions, setDimensions] = useState({ width: 1440, height: 900 });

  // Pan offset on virtual 2D/3D sphere
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panRef = useRef({ x: 0, y: 0 });
  panRef.current = pan;

  // Hierarchical Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

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

  // Card grid geometry: consistent, uniform grid matching reference video
  const CARD_W = 168;
  const CARD_H = 168;
  const GAP = 14; // clean, uniform gap everywhere without overlapping
  const STEP_X = CARD_W + GAP; // 182px
  const STEP_Y = CARD_H + GAP; // 182px

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

  // Sphere radius
  const sphereRadius = Math.max(dimensions.width, canvasHeight) * 0.65;

  // Top-right filter zone boundary to prevent card overlap
  const filterAreaLeft = dimensions.width - 250;
  const filterAreaBottom = selectedCategory ? 620 : 440;

  // Compute visible cards with 3D Spherical projection
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
      translateZ: number;
      zIndex: number;
    }> = [];

    const minCol = Math.floor((-pan.x - sphereRadius) / STEP_X);
    const maxCol = Math.ceil((-pan.x + dimensions.width + sphereRadius) / STEP_X);
    const minRow = Math.floor((-pan.y - sphereRadius) / STEP_Y);
    const maxRow = Math.ceil((-pan.y + canvasHeight + sphereRadius) / STEP_Y);

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        // Natural grid position without collapsing coordinates:
        const cardCenterX = c * STEP_X + pan.x + CARD_W / 2;
        const cardCenterY = r * STEP_Y + pan.y + CARD_H / 2;

        const dx = cardCenterX - cx;
        const dy = cardCenterY - cy;
        const dist = Math.hypot(dx, dy);

        // Cull cards outside sphere horizon
        if (dist > sphereRadius * 1.1) continue;

        const total = filteredNotes.length;
        const wrappedCol = ((c % GRID_COLS) + GRID_COLS) % GRID_COLS;
        const wrappedRow = ((r % GRID_ROWS) + GRID_ROWS) % GRID_ROWS;
        const noteIndex = (wrappedRow * GRID_COLS + wrappedCol) % total;
        const note = filteredNotes[noteIndex];
        if (!note) continue;

        const screenX = Math.round(cardCenterX - CARD_W / 2);
        const screenY = Math.round(cardCenterY - CARD_H / 2);

        // Cull cards outside canvas or under the top-right filter buttons
        if (screenY + CARD_H < 0 || screenY > canvasHeight + 100) continue;
        if (screenX + CARD_W < -100 || screenX > dimensions.width + 100) continue;
        if (screenX + CARD_W > filterAreaLeft && screenY < filterAreaBottom) continue;

        const normDist = Math.min(1.0, dist / sphereRadius);

        // 3D Spherical normal rotation & depth
        const rotY = Number(((dx / sphereRadius) * 26).toFixed(1));
        const rotX = Number((-(dy / sphereRadius) * 26).toFixed(1));
        const translateZ = Number((-(1 - Math.cos(normDist * (Math.PI / 2))) * 140).toFixed(1));

        // Organic Scale: Center is 1.0, gently scaling to 0.76 at horizon
        const scale = Number(Math.max(0.76, 1 - Math.pow(normDist, 1.6) * 0.24).toFixed(2));
        const opacity = Number(Math.max(0, 1 - Math.pow(normDist, 2.8)).toFixed(2));
        const zIndex = Math.round((1 - normDist) * 100);

        items.push({
          note,
          key: `${c}_${r}_${note.id}`,
          screenX,
          screenY,
          scale,
          opacity,
          rotX,
          rotY,
          translateZ,
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
    filterAreaLeft,
    filterAreaBottom,
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
    <div className="w-full h-screen flex flex-col bg-[#fbfbfb] text-black overflow-hidden select-none font-sans relative">
      {/* --- 1. TOP HEADER (Solid 100% Opaque, identical height to Stream mode, completely OUTSIDE 3D container!) --- */}
      <header className="interactive-control w-full h-[57px] bg-white border-b border-[#eeeeee] px-4 lg:px-8 py-3 flex items-center justify-between z-50 shrink-0 select-none shadow-2xs">
        {/* Left: Brand & Mode Switcher */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleResetAll}
            className="font-black text-2xl tracking-tight text-black font-sans hover:opacity-75 transition-opacity"
          >
            XP Seoul
          </button>

          {/* Mode Switcher Pill (No star icon!) */}
          <div className="flex items-center bg-[#f4f4f5] p-1 rounded-full border border-black/8 font-sans text-xs ml-2">
            <button
              onClick={onSwitchToStream}
              className="px-3 py-1 rounded-full text-[#666666] hover:text-black transition-colors"
            >
              Stream
            </button>
            <button className="px-3.5 py-1 rounded-full bg-white text-black font-semibold shadow-2xs">
              Globe
            </button>
          </div>
        </div>

        {/* Center: Search Bar */}
        <div className="relative flex-1 max-w-sm mx-4">
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#888888]" />
          <input
            type="text"
            placeholder="Search notes on globe..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-full bg-[#f4f4f5] border border-black/8 text-xs text-black placeholder-[#888888] focus:outline-hidden focus:bg-white focus:border-black/25 transition-all font-sans"
          />
        </div>

        {/* Right: Visible Count */}
        <div className="flex items-center gap-3 shrink-0 font-sans">
          <span className="font-mono text-[11px] text-[#888888]">
            Archive · <span className="font-semibold text-black">{filteredNotes.length.toLocaleString()}</span>
          </span>
        </div>
      </header>

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
        className="flex-1 w-full h-full relative overflow-hidden cursor-grab active:cursor-grabbing"
        style={{ perspective: '1200px' }}
      >
        {/* --- RIGHT TOP FLOATING FILTER BUTTONS (Individual Pills, No Box Container) --- */}
        <div className="interactive-control fixed top-[72px] right-6 z-40 flex flex-col items-end gap-1.5 select-none font-sans max-h-[82vh] overflow-y-auto no-scrollbar pb-6">
          {/* 1. Reset Button attached right at the top of the filters */}
          <button
            onClick={handleResetAll}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full shadow-xs border transition-all text-xs font-sans font-medium active:scale-95 mb-0.5 ${
              hasActiveFilter
                ? 'bg-black text-white border-black'
                : 'bg-white text-[#555555] border-black/8 hover:text-black hover:bg-[#f5f5f5]'
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
                ? 'bg-black text-white border-black font-semibold'
                : 'bg-white text-[#333333] border-black/8 hover:bg-black hover:text-white'
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
                      ? 'bg-black text-white border-black font-semibold'
                      : 'bg-white text-[#333333] border-black/8 hover:bg-black hover:text-white'
                  }`}
                >
                  <span>{cat}</span>
                  {isCatSelected && <ChevronDown className="w-3 h-3 text-white" />}
                </button>

                {/* Level 2: Sub-Categories (Unfolds right below selected category) */}
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
                                  ? 'bg-[#333333] text-white border-[#333333]'
                                  : 'bg-[#f4f4f6] text-[#444444] border-black/6 hover:bg-[#e8e8ea] hover:text-black'
                              }`}
                            >
                              ↳ {sub}
                            </button>

                            {/* Level 3: Topics (Unfolds right below selected sub-category) */}
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
                                            : 'bg-white text-[#666666] border-black/10 hover:border-black/30 hover:text-black'
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none px-4 py-2 rounded-full bg-white/90 backdrop-blur-md border border-black/8 text-[11px] font-sans text-[#666666] flex items-center gap-2 shadow-[0_6px_20px_rgba(0,0,0,0.06)]">
          <span className="w-1.5 h-1.5 rounded-full bg-black/60" />
          <span>Drag freely in all directions · Click note to inflate</span>
        </div>

        {/* --- 3D GLOBE CARDS LAYER (Uniform 14px Spacing, Zero Overlap, Razor-sharp Text) --- */}
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
                  transform: `translate3d(${item.screenX}px, ${item.screenY}px, ${item.translateZ}px) rotateX(${item.rotX}deg) rotateY(${item.rotY}deg) scale(${item.scale})`,
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
                    borderRadius: '24px',
                    WebkitFontSmoothing: 'antialiased',
                    MozOsxFontSmoothing: 'grayscale',
                    textRendering: 'optimizeLegibility',
                  }}
                  className="w-full h-full p-3.5 flex flex-col items-start gap-[8px] bg-white border border-black/8 shadow-[0_4px_16px_rgba(0,0,0,0.06),0_1px_4px_rgba(0,0,0,0.03)] transition-all duration-200 group-hover:border-black/25 group-hover:shadow-[0_10px_28px_rgba(0,0,0,0.12)] relative overflow-hidden"
                >
                  {/* 1. Title: Crisp Bold Geist Sans */}
                  <h3 className="font-sans font-bold text-[15.5px] text-black tracking-[-0.03em] leading-tight line-clamp-1 w-full shrink-0 antialiased">
                    {item.note.title}
                  </h3>

                  {/* 2. Topic Badge */}
                  <div className="bg-[#1e1e1e] flex items-center justify-center px-2 py-0.5 rounded-[4px] shrink-0 max-w-full truncate">
                    <p className="font-mono text-[#ececec] text-[9.5px] tracking-tight uppercase whitespace-nowrap truncate font-medium antialiased">
                      {item.note.topic || item.note.category}
                    </p>
                  </div>

                  {/* 3. tl;dr / Summary */}
                  <p className="text-[10px] text-[#444444] font-sans leading-[15px] tracking-tight line-clamp-3 w-full antialiased">
                    {tldrText}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- INFLATING NOTE DETAIL EXPANSION (부풀어오르는 인터랙션 애니메이션) --- */}
      <AnimatePresence>
        {selectedNote && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-8">
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
                borderRadius: 24,
              }}
              animate={{
                scale: 1,
                opacity: 1,
                x: 0,
                y: 0,
                borderRadius: 28,
              }}
              exit={{
                scale: 0.22,
                opacity: 0,
                x: clickOrigin ? clickOrigin.x - cx : 0,
                y: clickOrigin ? clickOrigin.y - (cy + HEADER_H) : 0,
                borderRadius: 24,
              }}
              transition={{
                type: 'spring',
                damping: 26,
                stiffness: 260,
                mass: 0.85,
              }}
              className="relative w-full max-w-[1080px] h-[90vh] max-h-[920px] bg-white text-black shadow-[0_25px_80px_rgba(0,0,0,0.45)] border border-black/10 rounded-[28px] overflow-hidden flex flex-col z-10"
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
                isMobile={false}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
