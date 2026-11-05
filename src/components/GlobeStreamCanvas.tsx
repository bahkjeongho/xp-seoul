import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { NoteItem, TaxonomyData } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Compass, 
  RotateCcw, 
  Sparkles,
  SlidersHorizontal,
  ChevronRight
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

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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

  // Filter notes
  const filteredNotes = useMemo(() => {
    let result = notes;
    if (selectedCategory) {
      result = result.filter((n) => n.category === selectedCategory);
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
  }, [notes, selectedCategory, searchQuery]);

  // Card grid geometry matching Figma (175px x 175px squircle)
  const CARD_W = 175;
  const CARD_H = 175;
  const GAP = 26;
  const STEP_X = CARD_W + GAP; // 201px
  const STEP_Y = CARD_H + GAP; // 201px

  // Grid columns based on notes length
  const GRID_COLS = useMemo(() => {
    return Math.max(14, Math.ceil(Math.sqrt(Math.max(1, filteredNotes.length) * 1.5)));
  }, [filteredNotes.length]);

  const GRID_ROWS = useMemo(() => {
    return Math.max(14, Math.ceil(Math.max(1, filteredNotes.length) / GRID_COLS));
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

  // Center of screen
  const cx = dimensions.width / 2;
  const cy = dimensions.height / 2;

  // Sphere radius
  const sphereRadius = Math.max(dimensions.width, dimensions.height) * 0.65;

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
      zIndex: number;
    }> = [];

    const minCol = Math.floor((-pan.x - sphereRadius * 1.1) / STEP_X);
    const maxCol = Math.ceil((-pan.x + dimensions.width + sphereRadius * 1.1) / STEP_X);
    const minRow = Math.floor((-pan.y - sphereRadius * 1.1) / STEP_Y);
    const maxRow = Math.ceil((-pan.y + dimensions.height + sphereRadius * 1.1) / STEP_Y);

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const cardCenterX = c * STEP_X + pan.x + CARD_W / 2;
        const cardCenterY = r * STEP_Y + pan.y + CARD_H / 2;

        const dx = cardCenterX - cx;
        const dy = cardCenterY - cy;
        const dist = Math.hypot(dx, dy);

        if (dist > sphereRadius * 1.05) continue;

        const total = filteredNotes.length;
        const wrappedCol = ((c % GRID_COLS) + GRID_COLS) % GRID_COLS;
        const wrappedRow = ((r % GRID_ROWS) + GRID_ROWS) % GRID_ROWS;
        const noteIndex = (wrappedRow * GRID_COLS + wrappedCol) % total;
        const note = filteredNotes[noteIndex];
        if (!note) continue;

        const normDist = dist / sphereRadius;
        const theta = normDist * (Math.PI / 2.2);

        const curvedDist = sphereRadius * Math.sin(theta);
        const ratio = dist > 0 ? curvedDist / dist : 1;
        const screenX = cx + dx * ratio - CARD_W / 2;
        const screenY = cy + dy * ratio - CARD_H / 2;

        const rotY = (dx / sphereRadius) * 40;
        const rotX = -(dy / sphereRadius) * 40;

        // Size differentiation: cards near center are 1.0, gently scaling down to 0.72 at perimeter
        const scale = Math.max(0.72, 1 - Math.pow(normDist, 1.7) * 0.28);
        const opacity = Math.max(0, 1 - Math.pow(normDist, 2.5));
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
    dimensions.height,
    cx,
    cy,
    sphereRadius,
    GRID_COLS,
    GRID_ROWS,
    STEP_X,
    STEP_Y,
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
      y: screenY + CARD_H / 2,
    });
    setSelectedNote(note);
  };

  const handleResetPosition = () => {
    setPan({ x: 0, y: 0 });
  };

  // Top categories for vertical filter stack
  const topCategories = useMemo(() => {
    return Object.keys(taxonomy);
  }, [taxonomy]);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
      className="w-full h-screen relative overflow-hidden select-none bg-[#fbfbfb] text-black cursor-grab active:cursor-grabbing font-sans"
      style={{ perspective: '1200px' }}
    >
      {/* --- TOP CONTROL HEADER (Clean Monotone) --- */}
      <header className="interactive-control fixed top-0 inset-x-0 z-50 px-6 py-3.5 flex items-center justify-between bg-[#fbfbfb]/96 backdrop-blur-2xl border-b border-black/8 select-none">
        {/* Left: Brand & Mode Switcher */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-baseline gap-2">
            <span className="font-extrabold text-xl tracking-tight text-black font-sans">XP Seoul</span>
            <span className="font-mono text-[10px] text-[#888888] uppercase tracking-widest hidden sm:inline">
              Globe
            </span>
          </div>

          {/* Mode Switcher Pill */}
          <div className="flex items-center bg-[#f0f0f2] p-1 rounded-full border border-black/5 font-sans text-xs">
            <button
              onClick={onSwitchToStream}
              className="px-3 py-1 rounded-full text-[#666666] hover:text-black transition-colors"
            >
              Stream
            </button>
            <button className="px-3.5 py-1 rounded-full bg-white text-black font-semibold shadow-2xs flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-black" />
              <span>Globe</span>
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
            className="w-full pl-9 pr-3 py-1.5 rounded-full bg-[#f4f4f6] border border-black/5 text-xs text-black placeholder-[#999999] focus:outline-hidden focus:bg-white focus:border-black/20 transition-all font-sans"
          />
        </div>

        {/* Right Info & Reset */}
        <div className="flex items-center gap-3 shrink-0 font-sans">
          <span className="font-mono text-[11px] text-[#888888] hidden md:inline">
            <span className="font-semibold text-black">{filteredNotes.length.toLocaleString()}</span> Notes
          </span>
          <button
            onClick={handleResetPosition}
            title="Reset Globe Center"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f4f4f6] hover:bg-[#eaeaea] text-[#555555] hover:text-black transition-all active:scale-95 border border-black/5 text-xs"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </header>

      {/* --- RIGHT FLOATING FILTER STACK (Exact Figma Style) --- */}
      <div className="interactive-control fixed right-6 top-1/2 -translate-y-1/2 z-40 flex flex-col items-end gap-2 select-none font-sans">
        <div className="bg-white/80 backdrop-blur-2xl border border-black/8 p-2 rounded-[22px] shadow-[0_12px_36px_rgba(0,0,0,0.06)] flex flex-col gap-1.5 max-h-[70vh] overflow-y-auto no-scrollbar">
          <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-[#999999] flex items-center gap-1.5">
            <SlidersHorizontal className="w-3 h-3 text-black" />
            <span>Filter</span>
          </div>

          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all text-left flex items-center justify-between gap-3 ${
              !selectedCategory
                ? 'bg-black text-white shadow-xs'
                : 'bg-[#f4f4f6] text-[#444444] hover:bg-[#eaeaea] hover:text-black'
            }`}
          >
            <span>All</span>
            <span className={`text-[10px] font-mono ${!selectedCategory ? 'text-white/70' : 'text-[#888888]'}`}>
              {notes.length}
            </span>
          </button>

          {topCategories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(isSelected ? null : cat)}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition-all text-left flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-black text-white shadow-xs'
                    : 'bg-[#f4f4f6] text-[#444444] hover:bg-[#eaeaea] hover:text-black'
                }`}
              >
                <span>{cat}</span>
                {isSelected && <ChevronRight className="w-3 h-3 text-white" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* --- FLOATING HELPER HINT --- */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none px-4 py-2 rounded-full bg-white/85 backdrop-blur-md border border-black/8 text-[11px] font-sans text-[#666666] flex items-center gap-2 shadow-[0_6px_20px_rgba(0,0,0,0.06)]">
        <Compass className="w-3.5 h-3.5 text-black animate-spin" style={{ animationDuration: '16s' }} />
        <span>Drag freely in all directions · Click note to inflate</span>
      </div>

      {/* --- 3D GLOBE CARDS LAYER (Figma Light Aesthetic) --- */}
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
              }}
              className="group cursor-pointer select-none"
            >
              {/* Figma Liquid Glass Squircle Card */}
              <div
                style={{
                  borderRadius: '26px',
                }}
                className="w-full h-full p-4 flex flex-col items-start gap-[9px] bg-white/95 backdrop-blur-xl border border-black/8 shadow-[0_10px_28px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.03)] transition-all duration-300 group-hover:border-black/25 group-hover:shadow-[0_16px_40px_rgba(0,0,0,0.12)] group-hover:-translate-y-1 relative overflow-hidden"
              >
                {/* 1. Title (Figma Bold 17px) */}
                <h3 className="font-sans font-bold text-[17px] text-black tracking-[-0.04em] leading-tight line-clamp-1 w-full shrink-0">
                  {item.note.title}
                </h3>

                {/* 2. Topic Badge (Figma bg-[#1e1e1e] badge) */}
                <div className="bg-[#1e1e1e] flex items-center justify-center px-2 py-0.5 rounded-[4px] shrink-0 max-w-full truncate">
                  <p className="font-mono text-[#ececec] text-[9.5px] tracking-[-0.2px] uppercase whitespace-nowrap truncate font-medium">
                    {item.note.topic || item.note.category}
                  </p>
                </div>

                {/* 3. tl;dr / Summary (Figma 10px text, 16px leading) */}
                <p className="text-[10px] text-[#444444] font-sans leading-[16px] tracking-[-0.3px] line-clamp-3 w-full">
                  {tldrText}
                </p>
              </div>
            </div>
          );
        })}
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
                y: clickOrigin ? clickOrigin.y - cy : 0,
                borderRadius: 26,
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
                y: clickOrigin ? clickOrigin.y - cy : 0,
                borderRadius: 26,
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
