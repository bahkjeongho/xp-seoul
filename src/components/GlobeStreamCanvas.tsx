import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { NoteItem, TaxonomyData } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  RotateCcw, 
  ChevronDown,
  SlidersHorizontal,
  X,
  Plus,
  Shuffle
} from 'lucide-react';
import { NoteDetailPanel } from './NoteDetailPanel';
import { MobileDetailBottomSheet } from './MobileDetailBottomSheet';
import type { FacetTaxonomyData } from './TopFilterBarFacet';
import type { ActiveFilterSlot, SortOrder } from './MultiFacetFilterBar';
import facetTaxonomyJson from '../data/facet-taxonomy.json';

interface GlobeStreamCanvasProps {
  notes: NoteItem[];
  taxonomy: TaxonomyData;
  knownTitles?: Set<string>;
  historyNotes?: NoteItem[];
  onAddToHistory?: (note: NoteItem) => void;
  onSwitchToStream: () => void;
  onNavigateWikilink?: (title: string) => void;
  activeFilterSlots?: ActiveFilterSlot[];
  onAddFilterSlot?: (slot: ActiveFilterSlot) => void;
  onRemoveFilterSlot?: (id: string) => void;
  onClearAllSlots?: () => void;
  sortOrder?: SortOrder;
  onSortOrderChange?: (order: SortOrder) => void;
  onReshuffle?: () => void;
}

export const GlobeStreamCanvas: React.FC<GlobeStreamCanvasProps> = ({
  notes,
  taxonomy,
  knownTitles,
  historyNotes,
  onAddToHistory,
  onSwitchToStream,
  onNavigateWikilink,
  activeFilterSlots: activeFilterSlotsProp,
  onAddFilterSlot: onAddFilterSlotProp,
  onRemoveFilterSlot: onRemoveFilterSlotProp,
  onClearAllSlots: onClearAllSlotsProp,
  sortOrder: sortOrderProp,
  onSortOrderChange: onSortOrderChangeProp,
  onReshuffle: onReshuffleProp,
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

  // Sorting state (default: 'random' per user request)
  const [internalSortOrder, setInternalSortOrder] = useState<SortOrder>('random');
  const [internalShuffleSeed, setInternalShuffleSeed] = useState<number>(0);
  const currentSortOrder = sortOrderProp ?? internalSortOrder;
  const handleSortOrderChange = onSortOrderChangeProp ?? setInternalSortOrder;
  const handleReshuffle = () => {
    setInternalShuffleSeed((s) => s + 1);
    if (onReshuffleProp) onReshuffleProp();
  };

  const randomRanks = useMemo(() => {
    const map = new Map<string, number>();
    notes.forEach((n) => {
      map.set(n.id, Math.random());
    });
    return map;
  }, [notes, internalShuffleSeed]);

  // Hierarchical Multi-Facet Filter & Search states
  const [facetData] = useState<FacetTaxonomyData>(facetTaxonomyJson as unknown as FacetTaxonomyData);
  const [internalSlots, setInternalSlots] = useState<ActiveFilterSlot[]>([]);
  const currentSlots = activeFilterSlotsProp ?? internalSlots;

  const handleAddFilterSlot = (slot: ActiveFilterSlot) => {
    if (onAddFilterSlotProp) {
      onAddFilterSlotProp(slot);
    } else {
      setInternalSlots((prev) => (prev.length >= 20 ? prev : [...prev, slot]));
    }
  };

  const handleRemoveFilterSlot = (id: string) => {
    if (onRemoveFilterSlotProp) {
      onRemoveFilterSlotProp(id);
    } else {
      setInternalSlots((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const handleClearAllSlots = () => {
    if (onClearAllSlotsProp) {
      onClearAllSlotsProp();
    } else {
      setInternalSlots([]);
    }
  };

  const [globeFilterAxis, setGlobeFilterAxis] = useState<'category' | 'type' | 'field' | 'region'>('category');
  const [expandedPrimary, setExpandedPrimary] = useState<string | null>(null);
  const [expandedSecondary, setExpandedSecondary] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Mobile Filter Sheet & Mobile Search Overlay states
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [mobileSheetTab, setMobileSheetTab] = useState<'history' | 'filter'>('filter');
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);

  // Active / Selected note for inflation modal
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);
  const [clickOrigin, setClickOrigin] = useState<{ x: number; y: number } | null>(null);

  // Drag interaction state with momentum & rAF batching
  const isDraggingRef = useRef(false);
  const isMouseDraggingRef = useRef(false);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const dragStartPanRef = useRef({ x: 0, y: 0 });
  const targetPanRef = useRef({ x: 0, y: 0 });
  const dragRafIdRef = useRef<number | null>(null);
  const touchHistoryRef = useRef<Array<{ x: number; y: number; time: number }>>([]);
  const mouseHistoryRef = useRef<Array<{ x: number; y: number; time: number }>>([]);
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

  // Read initial note from URL (?note=...)
  useEffect(() => {
    if (notes.length > 0 && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const noteParam = urlParams.get('note');
      if (noteParam) {
        const clean = noteParam.normalize().toLowerCase();
        const found = notes.find(
          (n) => n.id.normalize().toLowerCase() === clean || n.title.normalize().toLowerCase() === clean
        );
        if (found) {
          setSelectedNote(found);
          if (onAddToHistory) onAddToHistory(found);
        }
      }
    }
  }, [notes]);

  const isMobile = dimensions.width < 768;

  // Filter notes with multi-facet stacked union matching and sorting
  const filteredNotes = useMemo(() => {
    let result = notes;

    const hasSearch = Boolean(searchQuery.trim());

    // When not searching, filter out unlisted sub-item notes from globe sphere
    if (!hasSearch) {
      result = result.filter((n) => !n.unlisted);
    }

    if (currentSlots.length > 0) {
      result = result.filter((note) => {
        return currentSlots.some((slot) => {
          let match = true;
          if (slot.category && note.category !== slot.category) match = false;
          if (slot.subCategory && note.subCategory !== slot.subCategory) match = false;
          if (slot.type && note.type !== slot.type) match = false;
          if (slot.subType && note.subType !== slot.subType) match = false;
          if (slot.field && note.field !== slot.field) match = false;
          if (slot.subField && note.subField !== slot.subField) match = false;
          if (slot.country && (!note.countries || !note.countries.includes(slot.country))) match = false;
          if (slot.city && (!note.cities || !note.cities.includes(slot.city))) match = false;
          if (slot.topic) {
            const hasTopic =
              note.topic === slot.topic ||
              (note.topics && note.topics.includes(slot.topic));
            if (!hasTopic) match = false;
          }
          return match;
        });
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          (n.aliases && n.aliases.some((a) => a.toLowerCase().includes(q))) ||
          (n.topic && n.topic.toLowerCase().includes(q)) ||
          (n.tldr && n.tldr.toLowerCase().includes(q)) ||
          (n.cities && n.cities.some((c) => c.toLowerCase().includes(q))) ||
          (n.countries && n.countries.some((c) => c.toLowerCase().includes(q)))
      );
    }

    // Apply Sorting: Random (default), A → Z, Z → A
    if (currentSortOrder === 'asc') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
    } else if (currentSortOrder === 'desc') {
      result = [...result].sort((a, b) => b.title.localeCompare(a.title, undefined, { sensitivity: 'base' }));
    } else {
      // Default: 'random'
      result = [...result].sort((a, b) => (randomRanks.get(a.id) ?? 0) - (randomRanks.get(b.id) ?? 0));
    }

    return result;
  }, [notes, currentSlots, searchQuery, currentSortOrder, randomRanks]);

  // Card grid geometry: Responsive to Desktop vs Mobile (matches reference video)
  const CARD_W = isMobile ? 104 : 168;
  const CARD_H = isMobile ? 104 : 168;
  const GAP = isMobile ? 10 : 14;
  const STEP_X = CARD_W + GAP; // 114px on mobile, 182px on desktop
  const STEP_Y = CARD_H + GAP; // 114px on mobile, 182px on desktop

  // Grid columns based on notes length (compact when filtered notes are few)
  const GRID_COLS = useMemo(() => {
    const len = filteredNotes.length;
    if (len <= 1) return 1;
    if (len <= 4) return 2;
    if (len <= 9) return 3;
    if (len <= 16) return 4;
    if (len <= 36) return 6;
    if (len <= 64) return 8;
    return Math.max(16, Math.ceil(Math.sqrt(len * 1.5)));
  }, [filteredNotes.length]);

  const GRID_ROWS = useMemo(() => {
    const len = filteredNotes.length;
    if (len <= 1) return 1;
    return Math.ceil(len / GRID_COLS);
  }, [filteredNotes.length, GRID_COLS]);

  // Smooth Momentum glide physics on release (silky smooth deceleration)
  const startMomentum = useCallback(() => {
    const friction = 0.945;
    const minVelocity = 0.08;

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

  // --- NATIVE NON-PASSIVE TOUCH & MOUSE DRAG EVENT LISTENERS (Guaranteed iOS Safari & Mobile Touch Support) ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Touch Handlers (iOS Safari & Android: 1-finger drag pan, 2-finger pinch zoom)
    const onTouchStart = (e: TouchEvent) => {
      if ((e.target as HTMLElement).closest('.interactive-control')) return;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (dragRafIdRef.current !== null) {
        cancelAnimationFrame(dragRafIdRef.current);
        dragRafIdRef.current = null;
      }

      if (e.touches.length === 2) {
        // Two fingers: initialize pinch-to-zoom
        isDraggingRef.current = false;
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        initialPinchDistRef.current = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        initialZoomRef.current = zoomScaleRef.current;
        return;
      }

      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const now = performance.now();
        isDraggingRef.current = true;
        totalDragDistanceRef.current = 0;
        dragStartPosRef.current = { x: touch.clientX, y: touch.clientY };
        dragStartPanRef.current = { ...panRef.current };
        targetPanRef.current = { ...panRef.current };
        touchHistoryRef.current = [{ x: touch.clientX, y: touch.clientY, time: now }];
        velocityRef.current = { x: 0, y: 0 };
        initialPinchDistRef.current = null;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if ((e.target as HTMLElement).closest('.interactive-control')) return;
      if (!isDraggingRef.current && initialPinchDistRef.current === null) return;

      // Essential for iOS Safari: stops native scroll & prevents touch cancellation
      if (e.cancelable) {
        e.preventDefault();
      }

      if (e.touches.length === 2 && initialPinchDistRef.current !== null) {
        // Pinch-to-zoom centered on screen center
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const scaleChange = currentDist / initialPinchDistRef.current;
        const targetZoom = initialZoomRef.current * scaleChange;
        const newZoom = Math.min(1.5, Math.max(0.5, Number(targetZoom.toFixed(3))));
        const currentZoom = zoomScaleRef.current || 1.0;
        if (newZoom !== currentZoom) {
          const actualFactor = newZoom / currentZoom;
          setZoomScale(newZoom);
          setPan((p) => ({
            x: p.x * actualFactor,
            y: p.y * actualFactor,
          }));
        }
        return;
      }

      if (!isDraggingRef.current || e.touches.length !== 1) return;

      const touch = e.touches[0];
      const now = performance.now();
      const dx = touch.clientX - dragStartPosRef.current.x;
      const dy = touch.clientY - dragStartPosRef.current.y;
      totalDragDistanceRef.current += Math.hypot(
        touch.clientX - (touchHistoryRef.current[touchHistoryRef.current.length - 1]?.x ?? touch.clientX),
        touch.clientY - (touchHistoryRef.current[touchHistoryRef.current.length - 1]?.y ?? touch.clientY)
      );

      touchHistoryRef.current.push({ x: touch.clientX, y: touch.clientY, time: now });
      while (touchHistoryRef.current.length > 2 && now - touchHistoryRef.current[0].time > 120) {
        touchHistoryRef.current.shift();
      }

      targetPanRef.current = {
        x: dragStartPanRef.current.x + dx,
        y: dragStartPanRef.current.y + dy,
      };

      // V-Sync rAF batching: updates at 60/120fps without micro-stutters
      if (dragRafIdRef.current === null) {
        dragRafIdRef.current = requestAnimationFrame(() => {
          dragRafIdRef.current = null;
          setPan(targetPanRef.current);
        });
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        initialPinchDistRef.current = null;
      }
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;

      if (dragRafIdRef.current !== null) {
        cancelAnimationFrame(dragRafIdRef.current);
        dragRafIdRef.current = null;
      }
      setPan(targetPanRef.current);

      // Compute genuine flick velocity over the last 100ms
      const now = performance.now();
      const recent = touchHistoryRef.current.filter((p) => now - p.time <= 100);
      if (recent.length >= 2) {
        const first = recent[0];
        const last = recent[recent.length - 1];
        const dt = Math.max(12, last.time - first.time);
        const vx = ((last.x - first.x) / dt) * 16;
        const vy = ((last.y - first.y) / dt) * 16;
        const speed = Math.hypot(vx, vy);
        const maxSpeed = 38;
        const scale = speed > maxSpeed ? maxSpeed / speed : 1;
        velocityRef.current = {
          x: vx * scale,
          y: vy * scale,
        };
      } else {
        velocityRef.current = { x: 0, y: 0 };
      }

      startMomentum();
    };

    const onTouchCancel = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      if (dragRafIdRef.current !== null) {
        cancelAnimationFrame(dragRafIdRef.current);
        dragRafIdRef.current = null;
      }
    };

    // 2. Mouse Handlers (Desktop with continuous LERP smoothing)
    const runMouseDragLoop = () => {
      if (!isMouseDraggingRef.current) return;

      const current = panRef.current;
      const target = targetPanRef.current;
      const dx = target.x - current.x;
      const dy = target.y - current.y;

      // Silky smooth lerp damping: 0.32 gives instant response without stiffness or jitter
      if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) {
        const nextX = current.x + dx * 0.32;
        const nextY = current.y + dy * 0.32;
        setPan({ x: nextX, y: nextY });
      }

      dragRafIdRef.current = requestAnimationFrame(runMouseDragLoop);
    };

    const onMouseDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('.interactive-control, input, button, a')) return;
      if (e.button !== 0) return; // Only primary mouse button

      e.preventDefault();

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (dragRafIdRef.current !== null) {
        cancelAnimationFrame(dragRafIdRef.current);
        dragRafIdRef.current = null;
      }

      const now = performance.now();
      isDraggingRef.current = true;
      isMouseDraggingRef.current = true;
      totalDragDistanceRef.current = 0;
      dragStartPosRef.current = { x: e.clientX, y: e.clientY };
      dragStartPanRef.current = { ...panRef.current };
      targetPanRef.current = { ...panRef.current };
      mouseHistoryRef.current = [{ x: e.clientX, y: e.clientY, time: now }];
      velocityRef.current = { x: 0, y: 0 };
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';

      dragRafIdRef.current = requestAnimationFrame(runMouseDragLoop);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isMouseDraggingRef.current) return;

      const now = performance.now();
      const dx = e.clientX - dragStartPosRef.current.x;
      const dy = e.clientY - dragStartPosRef.current.y;
      totalDragDistanceRef.current += Math.hypot(e.movementX || 0, e.movementY || 0);

      mouseHistoryRef.current.push({ x: e.clientX, y: e.clientY, time: now });
      while (mouseHistoryRef.current.length > 2 && now - mouseHistoryRef.current[0].time > 120) {
        mouseHistoryRef.current.shift();
      }

      targetPanRef.current = {
        x: dragStartPanRef.current.x + dx,
        y: dragStartPanRef.current.y + dy,
      };
    };

    const onMouseUp = () => {
      if (!isMouseDraggingRef.current) return;
      isMouseDraggingRef.current = false;
      isDraggingRef.current = false;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';

      if (dragRafIdRef.current !== null) {
        cancelAnimationFrame(dragRafIdRef.current);
        dragRafIdRef.current = null;
      }

      const now = performance.now();
      const recent = mouseHistoryRef.current.filter((p) => now - p.time <= 100);
      if (recent.length >= 2) {
        const first = recent[0];
        const last = recent[recent.length - 1];
        const dt = Math.max(16, last.time - first.time);
        const timeSinceLastMove = now - last.time;

        if (timeSinceLastMove < 75) {
          const vx = ((last.x - first.x) / dt) * 16;
          const vy = ((last.y - first.y) / dt) * 16;
          const speed = Math.hypot(vx, vy);
          const maxSpeed = 38;
          const scale = speed > maxSpeed ? maxSpeed / speed : 1;

          // Residual drag difference smoothly adds to momentum
          const residualVx = (targetPanRef.current.x - panRef.current.x) * 0.18;
          const residualVy = (targetPanRef.current.y - panRef.current.y) * 0.18;

          velocityRef.current = {
            x: vx * scale * 0.88 + residualVx,
            y: vy * scale * 0.88 + residualVy,
          };
        } else {
          velocityRef.current = { x: 0, y: 0 };
        }
      } else {
        velocityRef.current = { x: 0, y: 0 };
      }

      startMomentum();
    };

    // Register non-passive touch listeners so iOS Safari NEVER cancels the gesture
    container.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: false });
    window.addEventListener('touchcancel', onTouchCancel, { passive: false });

    // Register desktop mouse listeners
    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchCancel);

      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [startMomentum]);

  // Zoom level state (0.45x to 2.2x, default 1.0)
  const [zoomScale, setZoomScale] = useState(1.0);
  const zoomScaleRef = useRef(1.0);
  useEffect(() => {
    zoomScaleRef.current = zoomScale;
  }, [zoomScale]);

  // Touch Pinch-to-zoom tracking refs
  const initialPinchDistRef = useRef<number | null>(null);
  const initialZoomRef = useRef<number>(1.0);

  // Mouse Wheel: Zoom in / Zoom out anchored precisely to the center of the screen
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (Math.abs(e.deltaY) < 1) return;

    const zoomFactor = e.deltaY < 0 ? 1.05 : 0.95;
    setZoomScale((prev) => {
      const next = Math.min(1.5, Math.max(0.5, Number((prev * zoomFactor).toFixed(3))));
      if (next !== prev) {
        const actualFactor = next / prev;
        setPan((p) => ({
          x: p.x * actualFactor,
          y: p.y * actualFactor,
        }));
      }
      return next;
    });
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

  // Sphere radius and curvature (fixed base geometry so globe curvature remains stable across zooms)
  const sphereRadius = Math.max(dimensions.width, canvasHeight) * (isMobile ? 0.62 : 0.72);
  const kCurvature = isMobile ? 0.42 : 0.36;

  // World grid step and gap proportional to zoomScale
  const worldStepX = STEP_X * zoomScale;
  const worldStepY = STEP_Y * zoomScale;
  const worldGap = GAP * zoomScale;

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

    const total = filteredNotes.length;
    const isFiniteGrid = total <= 64;

    const minCol = isFiniteGrid ? 0 : Math.floor((-pan.x - sphereRadius * 1.3) / worldStepX);
    const maxCol = isFiniteGrid ? GRID_COLS - 1 : Math.ceil((-pan.x + sphereRadius * 1.3) / worldStepX);
    const minRow = isFiniteGrid ? 0 : Math.floor((-pan.y - sphereRadius * 1.3) / worldStepY);
    const maxRow = isFiniteGrid ? GRID_ROWS - 1 : Math.ceil((-pan.y + sphereRadius * 1.3) / worldStepY);

    // Center offset when notes are few so they appear centered in the globe canvas
    const offsetX = isFiniteGrid ? -(GRID_COLS * worldStepX - worldGap) / 2 : 0;
    const offsetY = isFiniteGrid ? -(GRID_ROWS * worldStepY - worldGap) / 2 : 0;

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        let note: NoteItem | undefined;
        if (isFiniteGrid) {
          const index = r * GRID_COLS + c;
          if (index >= total) continue;
          note = filteredNotes[index];
        } else {
          const wrappedCol = ((c % GRID_COLS) + GRID_COLS) % GRID_COLS;
          const wrappedRow = ((r % GRID_ROWS) + GRID_ROWS) % GRID_ROWS;
          const noteIndex = (wrappedRow * GRID_COLS + wrappedCol) % total;
          note = filteredNotes[noteIndex];
        }
        if (!note) continue;

        const cardCenterX = isFiniteGrid
          ? cx + offsetX + c * worldStepX + pan.x + (CARD_W * zoomScale) / 2
          : cx + c * worldStepX + pan.x;
        const cardCenterY = isFiniteGrid
          ? cy + offsetY + r * worldStepY + pan.y + (CARD_H * zoomScale) / 2
          : cy + r * worldStepY + pan.y;

        const dx = cardCenterX - cx;
        const dy = cardCenterY - cy;
        const dist = Math.hypot(dx, dy);

        // Cull cards outside sphere horizon
        if (dist > sphereRadius * 1.25) continue;

        // Spherical curvature compression factor
        const normDist = dist / sphereRadius;
        const rFactor = 1.0 / Math.sqrt(1.0 + kCurvature * Math.pow(normDist, 2));

        // Curvilinear spherical screen positions
        const curvedCenterX = cx + dx * rFactor;
        const curvedCenterY = cy + dy * rFactor;

        const screenX = Math.round(curvedCenterX - CARD_W / 2);
        const screenY = Math.round(curvedCenterY - CARD_H / 2);

        // Cull cards that have completely scrolled outside the visible screen buffer
        const edgeBuffer = isMobile ? 30 : 80;
        if (screenY + CARD_H * zoomScale < -edgeBuffer || screenY > canvasHeight + edgeBuffer) continue;
        if (screenX + CARD_W * zoomScale < -edgeBuffer || screenX > dimensions.width + edgeBuffer) continue;

        // Dynamic 3D Spherical Normal Rotation
        const rotY = Number(((dx / sphereRadius) * 40 * rFactor).toFixed(1));
        const rotX = Number((-(dy / sphereRadius) * 40 * rFactor).toFixed(1));

        // Scale: card and gap scale in exact proportion with zoomScale so cards never collide
        const minScale = isMobile ? 0.35 : 0.42;
        const scale = Number((Math.max(minScale, Math.pow(rFactor, 2.8)) * zoomScale).toFixed(3));
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
    zoomScale,
    GRID_COLS,
    GRID_ROWS,
    CARD_W,
    CARD_H,
    worldStepX,
    worldStepY,
    worldGap,
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
    if (dragDist > 8 || totalDragDistanceRef.current > 8) return;

    setClickOrigin({
      x: screenX + CARD_W / 2,
      y: screenY + HEADER_H + CARD_H / 2,
    });
    setSelectedNote(note);
    if (onAddToHistory) {
      onAddToHistory(note);
    }
  };

  // Reset all filters and position
  const handleResetAll = () => {
    handleClearAllSlots();
    setSearchQuery('');
    setPan({ x: 0, y: 0 });
  };

  const commitGlobeSlot = (options: {
    primary?: string | null;
    secondary?: string | null;
    topic?: string | null;
  }) => {
    const p = options.primary ?? expandedPrimary;
    const s = options.secondary ?? null;
    const t = options.topic ?? null;
    if (!p && !s && !t) return;

    const isUnderPrimary = (slot: ActiveFilterSlot) => {
      if (slot.axis !== globeFilterAxis) return false;
      if (globeFilterAxis === 'category') return slot.category === p;
      if (globeFilterAxis === 'type') return slot.type === p;
      if (globeFilterAxis === 'field') return slot.field === p;
      if (globeFilterAxis === 'region') return slot.country === p;
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
      if (globeFilterAxis === 'category') return slot.subCategory === s;
      if (globeFilterAxis === 'type') return slot.subType === s;
      if (globeFilterAxis === 'field') return slot.subField === s;
      if (globeFilterAxis === 'region') return slot.city === s;
      return false;
    };

    const isPureSecondary = (slot: ActiveFilterSlot) => {
      return isUnderSecondary(slot) && !slot.topic;
    };

    // 1. TOPIC
    if (t) {
      const existing = currentSlots.find((slot) => isUnderSecondary(slot) && slot.topic === t);
      if (existing) {
        handleRemoveFilterSlot(existing.id);
        const remainingTopics = currentSlots.filter(
          (slot) => slot.id !== existing.id && isUnderSecondary(slot) && Boolean(slot.topic)
        );
        if (remainingTopics.length === 0 && s) {
          handleAddFilterSlot({
            id: `globe-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            axis: globeFilterAxis,
            label: s,
            category: globeFilterAxis === 'category' ? p : undefined,
            subCategory: globeFilterAxis === 'category' ? s : undefined,
            type: globeFilterAxis === 'type' ? p : undefined,
            subType: globeFilterAxis === 'type' ? s : undefined,
            field: globeFilterAxis === 'field' ? p : undefined,
            subField: globeFilterAxis === 'field' ? s : undefined,
            country: globeFilterAxis === 'region' ? p : undefined,
            city: globeFilterAxis === 'region' ? s : undefined,
          });
        }
        return;
      }

      if (currentSlots.length >= 20) return;
      const pureSec = currentSlots.find(isPureSecondary);
      if (pureSec) handleRemoveFilterSlot(pureSec.id);
      const purePrim = currentSlots.find(isPurePrimary);
      if (purePrim) handleRemoveFilterSlot(purePrim.id);

      handleAddFilterSlot({
        id: `globe-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        axis: globeFilterAxis,
        label: `#${t}`,
        category: globeFilterAxis === 'category' ? p : undefined,
        subCategory: globeFilterAxis === 'category' ? s : undefined,
        type: globeFilterAxis === 'type' ? p : undefined,
        subType: globeFilterAxis === 'type' ? s : undefined,
        field: globeFilterAxis === 'field' ? p : undefined,
        subField: globeFilterAxis === 'field' ? s : undefined,
        country: globeFilterAxis === 'region' ? p : undefined,
        city: globeFilterAxis === 'region' ? s : undefined,
        topic: t,
      });
      return;
    }

    // 2. SECONDARY (SUB)
    if (s) {
      const existing = currentSlots.find(isPureSecondary);
      if (existing) {
        handleRemoveFilterSlot(existing.id);
        const remainingUnderPrimary = currentSlots.filter(
          (slot) => slot.id !== existing.id && isUnderPrimary(slot)
        );
        if (remainingUnderPrimary.length === 0 && p) {
          handleAddFilterSlot({
            id: `globe-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            axis: globeFilterAxis,
            label: p,
            category: globeFilterAxis === 'category' ? p : undefined,
            type: globeFilterAxis === 'type' ? p : undefined,
            field: globeFilterAxis === 'field' ? p : undefined,
            country: globeFilterAxis === 'region' ? p : undefined,
          });
        }
        return;
      }

      if (currentSlots.length >= 20) return;
      const purePrim = currentSlots.find(isPurePrimary);
      if (purePrim) handleRemoveFilterSlot(purePrim.id);

      handleAddFilterSlot({
        id: `globe-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        axis: globeFilterAxis,
        label: s,
        category: globeFilterAxis === 'category' ? p : undefined,
        subCategory: globeFilterAxis === 'category' ? s : undefined,
        type: globeFilterAxis === 'type' ? p : undefined,
        subType: globeFilterAxis === 'type' ? s : undefined,
        field: globeFilterAxis === 'field' ? p : undefined,
        subField: globeFilterAxis === 'field' ? s : undefined,
        country: globeFilterAxis === 'region' ? p : undefined,
        city: globeFilterAxis === 'region' ? s : undefined,
      });
      return;
    }

    // 3. PRIMARY
    if (p) {
      const slotsUnder = currentSlots.filter(isUnderPrimary);
      if (slotsUnder.length > 0) {
        slotsUnder.forEach((sl) => handleRemoveFilterSlot(sl.id));
        return;
      }

      if (currentSlots.length >= 20) return;
      handleAddFilterSlot({
        id: `globe-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        axis: globeFilterAxis,
        label: p,
        category: globeFilterAxis === 'category' ? p : undefined,
        type: globeFilterAxis === 'type' ? p : undefined,
        field: globeFilterAxis === 'field' ? p : undefined,
        country: globeFilterAxis === 'region' ? p : undefined,
      });
      return;
    }
  };

  // Primary list based on current globeFilterAxis
  const globePrimaryList = useMemo(() => {
    if (globeFilterAxis === 'category') {
      return Object.entries(facetData.byCategory || {})
        .sort((a, b) => b[1].count - a[1].count)
        .map(([name, data]) => ({ name, count: data.count }));
    }
    if (globeFilterAxis === 'type') {
      return Object.entries(facetData.byType || {})
        .sort((a, b) => b[1].count - a[1].count)
        .map(([name, data]) => ({ name, count: data.count }));
    }
    if (globeFilterAxis === 'field') {
      return Object.entries(facetData.byField || {})
        .sort((a, b) => b[1].count - a[1].count)
        .map(([name, data]) => ({ name, count: data.count }));
    }
    if (globeFilterAxis === 'region') {
      return Object.entries(facetData.byRegion || {})
        .sort((a, b) => b[1].count - a[1].count)
        .map(([name, data]) => ({ name, count: data.count }));
    }
    return [];
  }, [globeFilterAxis, facetData]);

  // Secondary sub items for current axis + expandedPrimary
  const globeSecondaryList = useMemo(() => {
    if (!expandedPrimary) return [];
    let subs: Record<string, { count: number }> = {};
    if (globeFilterAxis === 'category') {
      subs = facetData.byCategory?.[expandedPrimary]?.subs || {};
    } else if (globeFilterAxis === 'type') {
      subs = facetData.byType?.[expandedPrimary]?.subs || {};
    } else if (globeFilterAxis === 'field') {
      subs = facetData.byField?.[expandedPrimary]?.subs || {};
    } else if (globeFilterAxis === 'region') {
      subs = facetData.byRegion?.[expandedPrimary]?.subs || {};
    }
    return Object.entries(subs)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([name, data]) => ({ name, count: data.count }));
  }, [globeFilterAxis, expandedPrimary, facetData]);

  // Active secondary/sub-item selected under expandedPrimary (reactive to active slots)
  const activeSecondaryName = useMemo(() => {
    if (!expandedPrimary) return null;
    const slot = currentSlots.find((s) => {
      if (s.axis !== globeFilterAxis) return false;
      if (globeFilterAxis === 'category') return s.category === expandedPrimary && Boolean(s.subCategory);
      if (globeFilterAxis === 'type') return s.type === expandedPrimary && Boolean(s.subType);
      if (globeFilterAxis === 'field') return s.field === expandedPrimary && Boolean(s.subField);
      if (globeFilterAxis === 'region') return s.country === expandedPrimary && Boolean(s.city);
      return false;
    });
    if (slot) {
      return slot.subCategory || slot.subType || slot.subField || slot.city || null;
    }
    return expandedSecondary;
  }, [currentSlots, globeFilterAxis, expandedPrimary, expandedSecondary]);

  // Topics for current axis + expandedPrimary + activeSecondaryName (reactive to selected sub-item)
  const globeTopicsList = useMemo(() => {
    if (!expandedPrimary) return [];
    const targetSub = activeSecondaryName;
    let topicMap: Record<string, number> = {};
    if (globeFilterAxis === 'category') {
      const cat = facetData.byCategory?.[expandedPrimary];
      if (targetSub && cat?.subs?.[targetSub]?.topics) {
        topicMap = cat.subs[targetSub].topics;
      } else {
        topicMap = cat?.topics || {};
      }
    } else if (globeFilterAxis === 'type') {
      const tp = facetData.byType?.[expandedPrimary];
      if (targetSub && tp?.subs?.[targetSub]?.topics) {
        topicMap = tp.subs[targetSub].topics;
      } else {
        topicMap = tp?.topics || {};
      }
    } else if (globeFilterAxis === 'field') {
      const fd = facetData.byField?.[expandedPrimary];
      if (targetSub && fd?.subs?.[targetSub]?.topics) {
        topicMap = fd.subs[targetSub].topics;
      } else {
        topicMap = fd?.topics || {};
      }
    } else if (globeFilterAxis === 'region') {
      const reg = facetData.byRegion?.[expandedPrimary];
      if (targetSub && reg?.subs?.[targetSub]?.topics) {
        topicMap = reg.subs[targetSub].topics;
      } else {
        topicMap = reg?.topics || {};
      }
    }
    return Object.entries(topicMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [globeFilterAxis, expandedPrimary, activeSecondaryName, facetData]);

  const hasActiveFilter = Boolean(currentSlots.length > 0 || searchQuery);

  return (
    <div className="w-full max-w-[100vw] h-screen flex flex-col bg-[#fbfbfb] text-black overflow-hidden select-none font-sans relative">
      {/* --- 1. TOP HEADER (Solid 100% Opaque, identical height to Stream mode, completely OUTSIDE 3D container!) --- */}
      <header className="interactive-control w-full max-w-[100vw] h-[57px] bg-white border-b border-[#eeeeee] px-4 sm:px-6 md:px-8 flex items-center justify-between z-50 shrink-0 select-none shadow-2xs box-border">
        {/* Left: Brand & Mode Switcher */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={handleResetAll}
            className="font-black text-xl sm:text-2xl tracking-tight text-black font-sans hover:opacity-75 transition-opacity"
          >
            XP Seoul
          </button>

          {/* Mode Switcher Pill (Visible on both Mobile & Desktop) */}
          <div className="flex items-center bg-[#f4f4f5] p-0.5 sm:p-1 rounded-full border border-black/8 font-sans text-[11px] sm:text-xs ml-1 sm:ml-2">
            <button
              onClick={onSwitchToStream}
              className="px-2.5 sm:px-3 py-1 rounded-full text-[#666666] hover:text-black transition-colors"
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

        {/* Right: Visible Count */}
        <div className="flex items-center gap-3 shrink-0 font-sans">
          <span className="font-mono text-[11px] text-[#888888]">
            <span className="hidden sm:inline">Archive · </span>
            <span className="font-semibold text-black">{filteredNotes.length.toLocaleString()}</span>
          </span>
        </div>
      </header>

      {/* --- DESKTOP ONLY: RIGHT TOP FLOATING FILTER BUTTONS (Lifted to top z-50 layer, strictly above 3D note cards) --- */}
      <div className="hidden md:flex interactive-control fixed top-[72px] right-6 z-50 flex-col items-end gap-2 select-none font-sans max-h-[82vh] overflow-y-auto no-scrollbar pb-6 max-w-sm pointer-events-auto">
        {/* Row 1: Reset & All Notes Pill */}
        <div className="flex items-center gap-1.5 shrink-0">
          {hasActiveFilter && (
            <button
              onClick={handleResetAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black text-white border border-black shadow-md text-xs font-sans font-medium active:scale-95 transition-all"
              title="Clear all filters and search"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}

          <button
            onClick={() => handleClearAllSlots()}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shadow-xs border text-right ${
              currentSlots.length === 0
                ? 'bg-black text-white border-black font-semibold shadow-md'
                : 'bg-white/90 backdrop-blur-md text-[#333333] border-black/8 hover:bg-black hover:text-white'
            }`}
          >
            All ({notes.length})
          </button>
        </div>

        {/* Row 2: Active Stacked Filters (if any) */}
        {currentSlots.length > 0 && (
          <div className="flex flex-col items-end gap-1.5 w-full bg-white/90 backdrop-blur-md p-2.5 rounded-2xl border border-black/8 shadow-xs">
            <div className="flex items-center justify-between w-full px-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#777777] font-semibold">
                Filters
              </span>
              <button
                onClick={handleClearAllSlots}
                className="text-[10px] font-mono text-[#888888] hover:text-black flex items-center gap-0.5"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Clear</span>
              </button>
            </div>
            <div className="flex flex-wrap justify-end gap-1.5 w-full">
              {currentSlots.map((slot) => {
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
                    className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full bg-black text-white text-[11px] font-mono shadow-xs"
                  >
                    <span className="w-3.5 h-3.5 rounded-[3px] bg-white text-black flex items-center justify-center text-[9px] font-bold shrink-0">
                      {badgeLetter}
                    </span>
                    <span className="text-white/40 text-[10px] select-none">|</span>
                    <span className="truncate max-w-[140px] font-medium">{slot.label}</span>
                    <button
                      onClick={() => handleRemoveFilterSlot(slot.id)}
                      className="hover:text-red-300 p-0.5 rounded-full"
                      aria-label="Remove filter"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Row 2.5: Note Sort Controls (Desktop Globe) */}
        <div className="flex items-center gap-1 p-1 bg-white/90 backdrop-blur-md rounded-full border border-black/8 shadow-xs shrink-0 font-mono text-xs">
          <button
            onClick={() => {
              if (currentSortOrder === 'random') {
                handleReshuffle();
              } else {
                handleSortOrderChange('random');
              }
            }}
            className={`px-2.5 py-1 rounded-full text-[11px] transition-all flex items-center gap-1 ${
              currentSortOrder === 'random'
                ? 'bg-black text-white font-semibold shadow-xs'
                : 'text-[#555555] hover:text-black hover:bg-black/5'
            }`}
            title="Random sort (click again to reshuffle)"
          >
            <Shuffle className="w-2.5 h-2.5" />
            <span>Random</span>
          </button>
          <button
            onClick={() => handleSortOrderChange('asc')}
            className={`px-2.5 py-1 rounded-full text-[11px] transition-all ${
              currentSortOrder === 'asc'
                ? 'bg-black text-white font-semibold shadow-xs'
                : 'text-[#555555] hover:text-black hover:bg-black/5'
            }`}
            title="Alphabetical A to Z"
          >
            A → Z
          </button>
          <button
            onClick={() => handleSortOrderChange('desc')}
            className={`px-2.5 py-1 rounded-full text-[11px] transition-all ${
              currentSortOrder === 'desc'
                ? 'bg-black text-white font-semibold shadow-xs'
                : 'text-[#555555] hover:text-black hover:bg-black/5'
            }`}
            title="Alphabetical Z to A"
          >
            Z → A
          </button>
        </div>

        {/* Row 3: Axis Switcher (Category | Type | Field | Region) */}
        <div className="flex items-center gap-1 p-1 bg-white/90 backdrop-blur-md rounded-full border border-black/8 shadow-xs shrink-0">
          {(['category', 'type', 'field', 'region'] as const).map((axis) => {
            const isSelected = globeFilterAxis === axis;
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
                  setGlobeFilterAxis(axis);
                  setExpandedPrimary(null);
                  setExpandedSecondary(null);
                }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-black text-white font-semibold shadow-xs'
                    : 'text-[#444444] hover:text-black hover:bg-black/5'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Row 4: Primary Items List (Expandable & Toggleable) */}
        <div className="flex flex-col items-end gap-1.5 w-full">
          {globePrimaryList.map((item) => {
            const isExpanded = expandedPrimary === item.name;
            const isPrimaryInSlots = currentSlots.some((s) => {
              if (s.axis !== globeFilterAxis) return false;
              if (globeFilterAxis === 'category') return s.category === item.name && !s.subCategory && !s.topic;
              if (globeFilterAxis === 'type') return s.type === item.name && !s.subType && !s.topic;
              if (globeFilterAxis === 'field') return s.field === item.name && !s.subField && !s.topic;
              if (globeFilterAxis === 'region') return s.country === item.name && !s.city && !s.topic;
              return false;
            });
            const hasSubsOrTopics = Boolean(
              (globeFilterAxis === 'category' && (Object.keys(facetData.byCategory?.[item.name]?.subs || {}).length > 0 || Object.keys(facetData.byCategory?.[item.name]?.topics || {}).length > 0)) ||
              (globeFilterAxis === 'type' && (Object.keys(facetData.byType?.[item.name]?.subs || {}).length > 0 || Object.keys(facetData.byType?.[item.name]?.topics || {}).length > 0)) ||
              (globeFilterAxis === 'field' && (Object.keys(facetData.byField?.[item.name]?.subs || {}).length > 0 || Object.keys(facetData.byField?.[item.name]?.topics || {}).length > 0)) ||
              (globeFilterAxis === 'region' && (Object.keys(facetData.byRegion?.[item.name]?.subs || {}).length > 0 || Object.keys(facetData.byRegion?.[item.name]?.topics || {}).length > 0))
            );

            return (
              <div key={item.name} className="flex flex-col items-end gap-1 w-full">
                {/* Primary Pill Button */}
                <button
                  onClick={() => {
                    commitGlobeSlot({ primary: item.name });
                    if (isExpanded) {
                      setExpandedPrimary(null);
                      setExpandedSecondary(null);
                    } else {
                      setExpandedPrimary(item.name);
                      setExpandedSecondary(null);
                    }
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shadow-xs border flex items-center justify-end gap-1.5 ${
                    isPrimaryInSlots
                      ? 'bg-black text-white border-black font-semibold shadow-md'
                      : isExpanded
                      ? 'bg-[#222222] text-white border-[#222222]'
                      : 'bg-white/90 backdrop-blur-md text-[#333333] border-black/8 hover:bg-black hover:text-white'
                  }`}
                >
                  <span>{item.name}</span>
                  <span className={`text-[10px] font-mono ${isPrimaryInSlots || isExpanded ? 'text-white/70' : 'text-[#888888]'}`}>
                    {item.count}
                  </span>
                  {hasSubsOrTopics && (
                    <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  )}
                </button>

                {/* Expanded Secondary & Topics Accordion */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex flex-col items-end gap-1.5 pr-1 py-1 overflow-hidden w-full max-w-xs"
                    >
                      {/* Sub-items */}
                      {globeSecondaryList.length > 0 && (
                        <div className="flex flex-wrap justify-end gap-1 my-0.5">
                          {globeSecondaryList.slice(0, 10).map((sub) => {
                            const isSubInSlots = currentSlots.some((s) => {
                              if (s.axis !== globeFilterAxis) return false;
                              if (globeFilterAxis === 'category') return s.subCategory === sub.name && !s.topic;
                              if (globeFilterAxis === 'type') return s.subType === sub.name && !s.topic;
                              if (globeFilterAxis === 'field') return s.subField === sub.name && !s.topic;
                              if (globeFilterAxis === 'region') return s.city === sub.name && !s.topic;
                              return false;
                            });
                            const isSubSelected = expandedSecondary === sub.name;

                            return (
                              <button
                                key={sub.name}
                                onClick={() => {
                                  if (isSubSelected) {
                                    setExpandedSecondary(null);
                                  } else {
                                    setExpandedSecondary(sub.name);
                                  }
                                  commitGlobeSlot({ primary: item.name, secondary: sub.name });
                                }}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-sans transition-all border ${
                                  isSubInSlots
                                    ? 'bg-black text-white border-black font-medium'
                                    : 'bg-white/85 backdrop-blur-md text-[#444444] border-black/8 hover:bg-black hover:text-white'
                                }`}
                              >
                                ↳ {sub.name} ({sub.count})
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Topics */}
                      {globeTopicsList.length > 0 && (
                        <div className="flex flex-wrap justify-end gap-1 my-0.5">
                          {globeTopicsList.slice(0, 12).map((top) => {
                            const isTopInSlots = currentSlots.some((s) => s.topic === top.name);
                            return (
                              <button
                                key={top.name}
                                onClick={() => commitGlobeSlot({ primary: item.name, secondary: activeSecondaryName, topic: top.name })}
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono transition-all border ${
                                  isTopInSlots
                                    ? 'bg-black text-white border-black font-bold'
                                    : 'bg-white/85 backdrop-blur-md text-[#555555] border-black/8 hover:border-black/30 hover:text-black'
                                }`}
                              >
                                • {top.name} ({top.count})
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- DESKTOP ONLY: BOTTOM FLOATING HELPER HINT --- */}
      <div className="hidden md:flex fixed bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none px-4 py-2 rounded-full bg-white/90 backdrop-blur-md border border-black/8 text-[11px] font-sans text-[#666666] items-center gap-2 shadow-[0_6px_20px_rgba(0,0,0,0.06)] whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-black/60 shrink-0" />
        <span>Drag freely in all directions · Click note to inflate</span>
      </div>

      {/* --- 2. MAIN 3D GLOBE CANVAS (Strictly below the header, overflow hidden, isolated z-0 stacking context) --- */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        className="flex-1 w-full max-w-[100vw] h-full relative z-0 overflow-hidden cursor-grab active:cursor-grabbing touch-none select-none"
        style={{
          perspective: '1200px',
          touchAction: 'none',
          overscrollBehavior: 'none',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
        }}
      >

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
                  transformOrigin: 'center center',
                  transform: `translate3d(${item.screenX}px, ${item.screenY}px, 0px) rotateX(${item.rotX}deg) rotateY(${item.rotY}deg) scale(${item.scale})`,
                  opacity: item.opacity,
                  zIndex: item.zIndex,
                  pointerEvents: item.opacity > 0.2 ? 'auto' : 'none',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  borderRadius: isMobile ? '18px' : '24px',
                  touchAction: 'none',
                }}
                className="group cursor-pointer select-none touch-none"
              >
                {/* Opaque white card for 100% razor sharp text rendering */}
                <div
                  style={{
                    borderRadius: isMobile ? '18px' : '24px',
                    WebkitFontSmoothing: 'antialiased',
                    MozOsxFontSmoothing: 'grayscale',
                    textRendering: 'optimizeLegibility',
                  }}
                  className={`w-full h-full flex flex-col items-start bg-white border border-black/8 shadow-[0_4px_16px_rgba(0,0,0,0.06),0_1px_4px_rgba(0,0,0,0.03)] transition-all duration-200 group-hover:border-black/25 group-hover:shadow-[0_10px_28px_rgba(0,0,0,0.12)] relative overflow-hidden select-none touch-none ${
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

      {/* --- MOBILE MAIN GLOBE FLOATING BAR (검색 | 필터) & CONNECTED BOTTOM SEARCH --- */}
      {isMobile && !selectedNote && (
        <AnimatePresence mode="wait">
          {isMobileSearchOpen ? (
            <motion.div
              key="globe-search-bar"
              initial={{ y: 20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="md:hidden fixed bottom-6 inset-x-4 max-w-sm mx-auto z-40 bg-white/95 backdrop-blur-xl rounded-full px-3.5 py-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.16)] flex items-center gap-2 border border-black/10 select-none font-sans"
            >
              <Search className="w-4 h-4 text-[#888888] shrink-0 ml-1" />
              <input
                type="text"
                autoFocus
                placeholder="Search notes on globe..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-[16px] text-black placeholder-[#888888] focus:outline-hidden font-sans py-1.5"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-1 rounded-full text-[#888888] hover:text-black"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setIsMobileSearchOpen(false)}
                className="text-xs font-sans text-[#666666] hover:text-black px-1.5 py-1 rounded-full shrink-0 font-medium"
              >
                Done
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="globe-control-pill"
              initial={{ y: 20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white/85 backdrop-blur-xl rounded-full px-3.5 py-2 shadow-[0_12px_36px_rgba(0,0,0,0.14)] flex items-center gap-2 border border-black/10 select-none font-sans whitespace-nowrap"
            >
              {/* Search Button */}
              <button
                onClick={() => setIsMobileSearchOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans font-medium transition-all ${
                  searchQuery
                    ? 'bg-black text-white shadow-xs'
                    : 'text-[#333333] hover:text-black active:bg-black/5'
                }`}
                aria-label="Toggle search"
              >
                <Search className="w-3.5 h-3.5" />
                <span className="truncate max-w-[85px]">{searchQuery || '검색'}</span>
              </button>

              {/* Hairline Divider */}
              <div className="w-[1px] h-3.5 bg-black/15" />

              {/* Filter Button */}
              <button
                onClick={() => setIsMobileFilterOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans font-medium transition-all ${
                  currentSlots.length > 0
                    ? 'bg-black text-white shadow-xs'
                    : 'text-[#333333] hover:text-black active:bg-black/5'
                }`}
                aria-label="Open filter"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="truncate max-w-[85px]">
                  {currentSlots.length > 0 ? currentSlots[currentSlots.length - 1].label : '필터'}
                </span>
                {currentSlots.length > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white ml-0.5" />
                )}
              </button>

              {/* Reset Button (only if active filter or search) */}
              {hasActiveFilter && (
                <button
                  onClick={handleResetAll}
                  className="w-7 h-7 rounded-full bg-black/5 hover:bg-black/10 active:scale-90 flex items-center justify-center text-[#555555] hover:text-black transition-all ml-0.5"
                  aria-label="Reset all filters"
                  title="Reset filters"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* --- MOBILE FILTER BOTTOM SHEET --- */}
      <AnimatePresence>
        {isMobile && isMobileFilterOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="interactive-control fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex flex-col justify-end"
            onClick={() => setIsMobileFilterOpen(false)}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="interactive-control w-full max-h-[85vh] h-[600px] bg-white rounded-t-[28px] shadow-2xl border-t border-black/10 flex flex-col overflow-hidden pb-8 font-sans"
            >
              {/* Top Drag Handle */}
              <div className="w-full pt-3 pb-1 flex justify-center cursor-pointer" onClick={() => setIsMobileFilterOpen(false)}>
                <div className="w-10 h-1 bg-[#d5d5d8] rounded-full" />
              </div>

              {/* Sheet Header */}
              <div className="flex items-center justify-between px-6 py-2.5 border-b border-[#eeeeee]">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-black" />
                  <span className="font-sans font-bold text-base text-black">Filters</span>
                  <span className="text-xs text-[#888888] font-mono">({filteredNotes.length.toLocaleString()} notes)</span>
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

              {/* Sheet Content */}
              <div
                className="flex-1 overflow-y-auto overscroll-contain p-4 flex flex-col gap-3 pb-8"
                style={{ touchAction: 'pan-y' }}
              >
                {/* 1. Active Stack Row */}
                <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-[#f8f8fa] border border-black/8">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#777777] font-semibold">
                      Filters
                    </span>
                    {currentSlots.length > 0 && (
                      <button
                        onClick={handleClearAllSlots}
                        className="flex items-center gap-1 text-[11px] text-[#888888] hover:text-black font-mono"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Clear All</span>
                      </button>
                    )}
                  </div>

                  {currentSlots.length === 0 ? (
                    <span className="text-xs font-mono text-[#999999] py-1 italic">
                      No filters applied. Showing all notes.
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {currentSlots.map((slot) => {
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
                              onClick={() => handleRemoveFilterSlot(slot.id)}
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

                {/* 2. Sort Order Segmented Selector (Globe Mobile) */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#f8f8fa] border border-black/8 font-mono text-xs">
                  <span className="text-[11px] uppercase tracking-wider text-[#777777] font-semibold">
                    Sort
                  </span>
                  <div className="flex items-center bg-white p-0.5 rounded-lg border border-black/10">
                    <button
                      onClick={() => {
                        if (currentSortOrder === 'random') {
                          handleReshuffle();
                        } else {
                          handleSortOrderChange('random');
                        }
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1 ${
                        currentSortOrder === 'random'
                          ? 'bg-black text-white shadow-xs font-semibold'
                          : 'text-[#666666]'
                      }`}
                    >
                      <Shuffle className="w-2.5 h-2.5" />
                      <span>Random</span>
                    </button>
                    <button
                      onClick={() => handleSortOrderChange('asc')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                        currentSortOrder === 'asc'
                          ? 'bg-black text-white shadow-xs font-semibold'
                          : 'text-[#666666]'
                      }`}
                    >
                      A → Z
                    </button>
                    <button
                      onClick={() => handleSortOrderChange('desc')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                        currentSortOrder === 'desc'
                          ? 'bg-black text-white shadow-xs font-semibold'
                          : 'text-[#666666]'
                      }`}
                    >
                      Z → A
                    </button>
                  </div>
                </div>

                {/* 3. Axis Switcher: Category | Type | Field | Region */}
                <div className="flex items-center gap-1.5 p-1 bg-[#f4f4f6] rounded-xl">
                  {(['category', 'type', 'field', 'region'] as const).map((axis) => {
                    const isSelected = globeFilterAxis === axis;
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
                          setGlobeFilterAxis(axis);
                          setExpandedPrimary(null);
                          setExpandedSecondary(null);
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
                    Select {globeFilterAxis === 'category' ? 'Category' : globeFilterAxis === 'type' ? 'Type' : globeFilterAxis === 'field' ? 'Field' : 'Country'}:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {globePrimaryList.map((item) => {
                      const isExpanded = expandedPrimary === item.name;
                      const isPrimaryInSlots = currentSlots.some((s) => {
                        if (s.axis !== globeFilterAxis) return false;
                        if (globeFilterAxis === 'category') return s.category === item.name && !s.subCategory && !s.topic;
                        if (globeFilterAxis === 'type') return s.type === item.name && !s.subType && !s.topic;
                        if (globeFilterAxis === 'field') return s.field === item.name && !s.subField && !s.topic;
                        if (globeFilterAxis === 'region') return s.country === item.name && !s.city && !s.topic;
                        return false;
                      });

                      return (
                        <button
                          key={item.name}
                          onClick={() => {
                            commitGlobeSlot({ primary: item.name });
                            if (isExpanded) {
                              setExpandedPrimary(null);
                              setExpandedSecondary(null);
                            } else {
                              setExpandedPrimary(item.name);
                              setExpandedSecondary(null);
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
                          <span className={`text-[10px] font-mono ml-1 ${isPrimaryInSlots || isExpanded ? 'text-white/80' : 'text-[#888888]'}`}>
                            {item.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Sub-Categories / Sub-Types / Sub-Fields / Cities */}
                {expandedPrimary && globeSecondaryList.length > 0 && (
                  <div className="flex flex-col gap-1.5 pt-2 border-t border-[#f0f0f0]">
                    <span className="text-[11px] font-mono text-[#888888] uppercase tracking-wider">
                      {globeFilterAxis === 'region' ? 'Cities' : 'Sub-items'} ({expandedPrimary}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {globeSecondaryList.map((sub) => {
                        const isSubInSlots = currentSlots.some((s) => {
                          if (s.axis !== globeFilterAxis) return false;
                          if (globeFilterAxis === 'category') return s.subCategory === sub.name && !s.topic;
                          if (globeFilterAxis === 'type') return s.subType === sub.name && !s.topic;
                          if (globeFilterAxis === 'field') return s.subField === sub.name && !s.topic;
                          if (globeFilterAxis === 'region') return s.city === sub.name && !s.topic;
                          return false;
                        });

                        return (
                          <button
                            key={sub.name}
                            onClick={() => {
                              commitGlobeSlot({ primary: expandedPrimary, secondary: sub.name });
                              setExpandedSecondary((prev) => (prev === sub.name ? null : sub.name));
                            }}
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

                {/* 6. Topics */}
                {expandedPrimary && globeTopicsList.length > 0 && (
                  <div className="flex flex-col gap-1.5 pt-2 border-t border-[#f0f0f0]">
                    <span className="text-[11px] font-mono text-[#888888] uppercase tracking-wider">
                      Related Topics:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {globeTopicsList.slice(0, 30).map((top) => {
                        const isTopInSlots = currentSlots.some((s) => s.axis === globeFilterAxis && s.topic === top.name);
                        return (
                          <button
                            key={top.name}
                            onClick={() => commitGlobeSlot({ primary: expandedPrimary, secondary: activeSecondaryName, topic: top.name })}
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

      {/* --- MOBILE GLOBE NOTE READING FLOATING CONTROLLER BAR (Filter - Close - History) --- */}
      <AnimatePresence>
        {isMobile && selectedNote && !isMobileSheetOpen && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 280 }}
            style={{ zIndex: 9999 }}
            className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto bg-white/95 backdrop-blur-xl text-black rounded-full px-4 py-2 shadow-[0_12px_36px_rgba(0,0,0,0.16)] flex items-center gap-3 border border-black/10 select-none font-sans"
          >
            {/* 1. Left: Filter Button */}
            <button
              onClick={() => {
                setMobileSheetTab('filter');
                setIsMobileSheetOpen(true);
              }}
              className="flex items-center text-[13px] font-sans font-medium text-[#222222] hover:text-black active:opacity-70 transition-colors px-1"
            >
              <span>Filter</span>
              {currentSlots.length > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-black ml-1.5" />
              )}
            </button>

            {/* 2. Center: Close Button (Circular X icon) */}
            <button
              onClick={() => setSelectedNote(null)}
              className="w-7 h-7 rounded-full bg-black/5 hover:bg-black/10 active:scale-90 flex items-center justify-center text-black transition-all"
              aria-label="Close Note"
            >
              <X className="w-3.5 h-3.5 stroke-[2.2]" />
            </button>

            {/* 3. Right: History Button */}
            <button
              onClick={() => {
                setMobileSheetTab('history');
                setIsMobileSheetOpen(true);
              }}
              className="flex items-center text-[13px] font-sans font-medium text-[#222222] hover:text-black active:opacity-70 transition-colors px-1"
            >
              <span>History</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MOBILE GLOBE NOTE READING BOTTOM SHEET (History & Filter) --- */}
      <MobileDetailBottomSheet
        isOpen={isMobile && Boolean(selectedNote) && isMobileSheetOpen}
        activeTab={mobileSheetTab}
        onChangeTab={setMobileSheetTab}
        onClose={() => setIsMobileSheetOpen(false)}
        historyNotes={historyNotes || []}
        selectedNote={selectedNote}
        notes={filteredNotes}
        facetData={facetData}
        activeFilterSlots={currentSlots}
        onAddFilterSlot={handleAddFilterSlot}
        onRemoveFilterSlot={handleRemoveFilterSlot}
        onClearAllSlots={handleClearAllSlots}
        onSelectNote={(note) => {
          setSelectedNote(note);
          if (onAddToHistory) onAddToHistory(note);
          setIsMobileSheetOpen(false);
        }}
      />
    </div>
  );
};
