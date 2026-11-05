import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { NoteItem, TaxonomyData } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Search, 
  Compass, 
  RotateCcw, 
  ArrowUpRight, 
  Layers, 
  Sparkles,
  Maximize2
} from 'lucide-react';
import { NoteDetailPanel } from './NoteDetailPanel';

interface GlobeStreamCanvasProps {
  notes: NoteItem[];
  taxonomy: TaxonomyData;
  knownTitles?: Set<string>;
  onSwitchToStream: () => void;
  onNavigateWikilink?: (title: string) => void;
}

// Category accent colors for Apple-style square cards
const getCategoryAccent = (category: string, topic?: string) => {
  const cat = (category || '').toLowerCase();
  const top = (topic || '').toLowerCase();
  if (cat.includes('object') || top.includes('product') || top.includes('hardware')) {
    return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' };
  }
  if (cat.includes('clipping') || top.includes('news') || top.includes('article')) {
    return { color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)', text: '#22d3ee', border: 'rgba(6, 182, 212, 0.3)' };
  }
  if (top.includes('fashion') || top.includes('brand') || top.includes('stylist')) {
    return { color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' };
  }
  if (top.includes('music') || top.includes('artist') || top.includes('album')) {
    return { color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)', text: '#f472b6', border: 'rgba(236, 72, 153, 0.3)' };
  }
  if (top.includes('architect') || top.includes('space') || top.includes('interior')) {
    return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' };
  }
  return { color: '#6366f1', bg: 'rgba(99, 102, 241, 0.15)', text: '#818cf8', border: 'rgba(99, 102, 241, 0.3)' };
};

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

  // Card grid geometry
  const CARD_W = 210;
  const CARD_H = 210;
  const GAP = 24;
  const STEP_X = CARD_W + GAP; // 234px
  const STEP_Y = CARD_H + GAP; // 234px

  // Grid columns based on notes length
  const GRID_COLS = useMemo(() => {
    return Math.max(12, Math.ceil(Math.sqrt(Math.max(1, filteredNotes.length) * 1.6)));
  }, [filteredNotes.length]);

  const GRID_ROWS = useMemo(() => {
    return Math.max(12, Math.ceil(Math.max(1, filteredNotes.length) / GRID_COLS));
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

  // Mouse Wheel Navigation (pan in both axes)
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

  // Sphere radius: determines curvature and horizon boundary
  const sphereRadius = Math.max(dimensions.width, dimensions.height) * 0.62;

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

    // Range of rows and cols within sphere bounds
    const minCol = Math.floor((-pan.x - sphereRadius * 1.1) / STEP_X);
    const maxCol = Math.ceil((-pan.x + dimensions.width + sphereRadius * 1.1) / STEP_X);
    const minRow = Math.floor((-pan.y - sphereRadius * 1.1) / STEP_Y);
    const maxRow = Math.ceil((-pan.y + dimensions.height + sphereRadius * 1.1) / STEP_Y);

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        // Flat coordinate of card center
        const cardCenterX = c * STEP_X + pan.x + CARD_W / 2;
        const cardCenterY = r * STEP_Y + pan.y + CARD_H / 2;

        // Offset from screen center
        const dx = cardCenterX - cx;
        const dy = cardCenterY - cy;
        const dist = Math.hypot(dx, dy);

        // Cull cards outside the sphere horizon
        if (dist > sphereRadius * 1.05) continue;

        // Map (col, row) to note index using toroidal wrapping
        const total = filteredNotes.length;
        const wrappedCol = ((c % GRID_COLS) + GRID_COLS) % GRID_COLS;
        const wrappedRow = ((r % GRID_ROWS) + GRID_ROWS) % GRID_ROWS;
        const noteIndex = (wrappedRow * GRID_COLS + wrappedCol) % total;
        const note = filteredNotes[noteIndex];
        if (!note) continue;

        // Spherical barrel projection:
        // Angle from center normal theta (0 at center, pi/2 at horizon)
        const normDist = dist / sphereRadius;
        const theta = normDist * (Math.PI / 2.2);

        // Spherical curved screen position
        const curvedDist = sphereRadius * Math.sin(theta);
        const ratio = dist > 0 ? curvedDist / dist : 1;
        const screenX = cx + dx * ratio - CARD_W / 2;
        const screenY = cy + dy * ratio - CARD_H / 2;

        // 3D rotations matching spherical surface
        const rotY = (dx / sphereRadius) * 44;
        const rotX = -(dy / sphereRadius) * 44;

        // Scale and opacity tapering towards sphere perimeter
        const scale = Math.max(0.62, 1 - Math.pow(normDist, 1.8) * 0.36);
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

  // Handle card click (distinguish drag from click)
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
    if (dragDist > 12) return; // ignore if was deliberate drag

    setClickOrigin({
      x: screenX + CARD_W / 2,
      y: screenY + CARD_H / 2,
    });
    setSelectedNote(note);
  };

  // Reset globe position to center
  const handleResetPosition = () => {
    setPan({ x: 0, y: 0 });
  };

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
      className="w-full h-screen relative overflow-hidden select-none bg-[#0a0a0c] text-white cursor-grab active:cursor-grabbing font-sans"
      style={{ perspective: '1200px' }}
    >
      {/* Background Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] rounded-full bg-indigo-950/20 blur-[140px]" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-violet-950/15 blur-[160px]" />
      </div>

      {/* --- TOP CONTROL BAR --- */}
      <header className="interactive-control fixed top-0 inset-x-0 z-50 px-6 py-3.5 flex items-center justify-between bg-[#0a0a0c]/90 backdrop-blur-2xl border-b border-white/10 select-none">
        {/* Brand & Mode Switcher */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-baseline gap-2">
            <span className="font-extrabold text-lg tracking-tight text-white">XP Seoul</span>
            <span className="font-mono text-[10px] text-white/50 uppercase tracking-widest hidden sm:inline">
              Archive Globe
            </span>
          </div>

          {/* Stream vs Globe Mode Switcher Pill */}
          <div className="flex items-center bg-white/10 p-1 rounded-full border border-white/10 font-sans text-xs">
            <button
              onClick={onSwitchToStream}
              className="px-3 py-1 rounded-full text-white/60 hover:text-white transition-colors"
            >
              Stream
            </button>
            <button className="px-3.5 py-1 rounded-full bg-white text-black font-semibold shadow-xs flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-indigo-600" />
              <span>Globe</span>
              <span className="text-[9px] bg-black text-white px-1.5 py-0.2 rounded-full font-mono">BETA</span>
            </button>
          </div>
        </div>

        {/* Center: Search & Categories */}
        <div className="flex items-center gap-3 max-w-2xl flex-1 mx-6 overflow-hidden">
          <div className="relative shrink-0 w-44 lg:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search globe..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-full bg-white/8 border border-white/10 text-xs text-white placeholder-white/35 focus:outline-hidden focus:border-white/30 transition-all font-sans"
            />
          </div>

          {/* Quick Category Buttons */}
          <div className="hidden md:flex items-center gap-1.5 text-[11px] font-sans overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1 rounded-full whitespace-nowrap transition-all ${
                !selectedCategory
                  ? 'bg-white text-black font-semibold shadow-xs'
                  : 'text-white/60 hover:text-white hover:bg-white/10 border border-white/8'
              }`}
            >
              All ({notes.length})
            </button>
            {Object.keys(taxonomy).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                className={`px-3 py-1 rounded-full whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-white text-black font-semibold shadow-xs'
                    : 'text-white/60 hover:text-white hover:bg-white/10 border border-white/8'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Right Info & Reset */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-mono text-[10px] text-white/50 tracking-wider hidden lg:inline">
            {filteredNotes.length.toLocaleString()} Notes
          </span>
          <button
            onClick={handleResetPosition}
            title="Reset Globe Center"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/8 hover:bg-white/15 text-white/70 hover:text-white transition-all active:scale-95 border border-white/10 text-xs font-sans"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </header>

      {/* --- FLOATING HELPER HINT --- */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none px-4 py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-sans text-white/60 flex items-center gap-2 shadow-lg">
        <Compass className="w-3.5 h-3.5 text-white/70 animate-spin" style={{ animationDuration: '16s' }} />
        <span>Drag in any direction · Click card to inflate · Scroll to pan</span>
      </div>

      {/* --- 3D GLOBE CARDS LAYER --- */}
      <div className={`absolute inset-0 transition-opacity duration-300 ${selectedNote ? 'opacity-20 pointer-events-none' : 'pointer-events-none'}`}>
        {visibleCards.map((item) => {
          const accent = getCategoryAccent(item.note.category, item.note.topic);
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
              {/* Apple Squircle Card Container */}
              <div
                style={{
                  borderRadius: '26px',
                  background: 'linear-gradient(145deg, rgba(32, 32, 36, 0.92) 0%, rgba(18, 18, 22, 0.96) 100%)',
                }}
                className="w-full h-full p-4 flex flex-col justify-between border border-white/10 shadow-[0_10px_28px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all duration-300 group-hover:border-white/30 group-hover:shadow-[0_16px_36px_rgba(0,0,0,0.7)] group-hover:-translate-y-1 relative overflow-hidden"
              >
                {/* Subtle Top Inner Edge Highlight (Apple Glass Light) */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                {/* Card Header: Topic Badge & Category Pill */}
                <div className="flex items-center justify-between gap-1.5 shrink-0">
                  <div
                    style={{ backgroundColor: accent.bg, borderColor: accent.border }}
                    className="px-2.5 py-0.5 rounded-full border text-[9px] font-mono uppercase tracking-wider font-semibold truncate flex items-center gap-1.5"
                  >
                    <span
                      style={{ backgroundColor: accent.color }}
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                    />
                    <span style={{ color: accent.text }} className="truncate">
                      {item.note.topic || item.note.category}
                    </span>
                  </div>

                  <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-white/30 group-hover:text-white/80 group-hover:bg-white/15 transition-all">
                    <ArrowUpRight className="w-3 h-3" />
                  </div>
                </div>

                {/* Card Center: Note Title */}
                <div className="flex-1 flex flex-col justify-center my-1.5 min-w-0">
                  <h3 className="font-sans font-bold text-[15px] leading-snug tracking-tight text-white group-hover:text-white transition-colors line-clamp-2">
                    {item.note.title}
                  </h3>
                </div>

                {/* Card Footer: tl;dr Summary */}
                <div className="shrink-0 pt-1 border-t border-white/6">
                  <p className="text-[11px] font-sans text-[#a1a1aa] line-clamp-2 leading-relaxed">
                    {tldrText}
                  </p>
                </div>
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
              className="absolute inset-0 bg-black/80 backdrop-blur-2xl"
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
              className="relative w-full max-w-[1080px] h-[90vh] max-h-[920px] bg-white text-black shadow-[0_25px_80px_rgba(0,0,0,0.6)] border border-black/10 rounded-[28px] overflow-hidden flex flex-col z-10"
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
