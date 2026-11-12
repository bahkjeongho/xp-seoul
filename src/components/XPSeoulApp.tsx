import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { NoteItem, TaxonomyData } from '../types';
import { TopFilterBar } from './TopFilterBar';
import { MultiFacetFilterBar, type ActiveFilterSlot, type SortOrder } from './MultiFacetFilterBar';
import type { FacetTaxonomyData } from './TopFilterBarFacet';
import facetTaxonomyJson from '../data/facet-taxonomy.json';
import { MiddleNavColumn } from './MiddleNavColumn';
import { MobileDetailBottomSheet } from './MobileDetailBottomSheet';
import { NoteDetailPanel } from './NoteDetailPanel';
import { GlobeStreamCanvas } from './GlobeStreamCanvas';
import { MenuNav, type AppMenu } from './MenuNav';
import { BlogView } from './BlogView';
import { MagazineView } from './MagazineView';
import { AboutView } from './AboutView';
import { AnimatePresence, motion } from 'framer-motion';
import { History, SlidersHorizontal, Menu as MenuIcon, X, AlertCircle, Sparkles, RotateCcw, Search } from 'lucide-react';

interface XPSeoulAppProps {
  initialNotes?: NoteItem[];
  initialTaxonomy?: TaxonomyData;
  initialViewMode?: 'stream' | 'globe';
}

export const XPSeoulApp: React.FC<XPSeoulAppProps> = ({
  initialNotes = [],
  initialTaxonomy = {},
  initialViewMode = 'stream',
}) => {
  const [viewMode, setViewMode] = useState<'stream' | 'globe'>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const modeParam = urlParams.get('mode');
      if (modeParam === 'stream') return 'stream';
      if (modeParam === 'globe' || window.location.pathname.startsWith('/globe')) return 'globe';
      // Mobile default: globe per user request
      if (window.innerWidth < 768) {
        return 'globe';
      }
    }
    return initialViewMode;
  });
  const [notes, setNotes] = useState<NoteItem[]>(initialNotes);
  const [taxonomy, setTaxonomy] = useState<TaxonomyData>(initialTaxonomy);
  const [isLoading, setIsLoading] = useState<boolean>(initialNotes.length === 0);

  // Filters State: Multi-Facet Stacked Filters (Up to 3)
  const [activeFilterSlots, setActiveFilterSlots] = useState<ActiveFilterSlot[]>([]);
  const [facetData] = useState<FacetTaxonomyData>(facetTaxonomyJson as unknown as FacetTaxonomyData);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Navigation & Detail State (Wiki, Blog, Magazine, About)
  const [activeMenu, setActiveMenu] = useState<AppMenu>('wiki');
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);

  // Visited History Stack (last 10 notes)
  const [historyNotes, setHistoryNotes] = useState<NoteItem[]>([]);

  // Backlinks (Linked Mentions) Index
  const [backlinks, setBacklinks] = useState<Record<string, { sourceId: string; context: string }[]> | null>(null);

  // Load backlinks index on client
  useEffect(() => {
    fetch('/data/backlinks.json')
      .then((r) => r.json())
      .then((data) => setBacklinks(data))
      .catch((err) => console.error('Failed to load backlinks:', err));
  }, []);

  // Toast notification for unresolved notes
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Mobile Drawer State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // Mobile Bottom Sheet State (History & Filter while reading notes)
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState<boolean>(false);
  const [mobileSheetTab, setMobileSheetTab] = useState<'history' | 'filter'>('history');

  // Note Sorting State (Default: 'random' per user request)
  const [sortOrder, setSortOrder] = useState<SortOrder>('random');
  const [shuffleSeed, setShuffleSeed] = useState<number>(0);

  // Stable random order mapping per note
  const randomRanks = useMemo(() => {
    const map = new Map<string, number>();
    notes.forEach((n) => {
      map.set(n.id, Math.random());
    });
    return map;
  }, [notes, shuffleSeed]);

  // Detect Mobile Viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Set of all known note titles & aliases for wikilink resolution
  const knownTitles = useMemo(() => {
    const s = new Set<string>();
    for (const n of notes) {
      s.add(n.title.toLowerCase());
      s.add(n.id.toLowerCase());
      if (n.aliases) {
        n.aliases.forEach((a) => s.add(a.toLowerCase()));
      }
    }
    return s;
  }, [notes]);

  // Client-side fetch fallback if props were not provided at SSR
  useEffect(() => {
    if (notes.length === 0) {
      Promise.all([
        fetch('/data/notes-light.json').then((r) => r.json()),
        fetch('/data/taxonomy.json').then((r) => r.json()),
      ]).then(([notesData, taxData]) => {
        setNotes(notesData);
        setTaxonomy(taxData);
        setIsLoading(false);
      }).catch((err) => {
        console.error('Failed to load local data:', err);
        setIsLoading(false);
      });
    }
  }, [notes.length]);

  // Read initial viewMode from URL (?mode=...) or default mobile to globe on first mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const modeParam = urlParams.get('mode');
      if (modeParam === 'stream') {
        setViewMode('stream');
      } else if (modeParam === 'globe' || window.location.pathname.startsWith('/globe')) {
        setViewMode('globe');
      } else if (window.innerWidth < 768) {
        // Mobile default: globe per user request
        setViewMode('globe');
      }
    }
  }, []);

  // Read initial note from URL (?note=...) on first mount
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
          setHistoryNotes([found]);
        }
      }
    }
  }, [notes]);

  // Track History & Browser History API (Cmd + [ and Cmd + ])
  const selectNoteWithHistory = useCallback((note: NoteItem | null, pushBrowserHistory: boolean = true) => {
    setSelectedNote(note);

    if (note) {
      // Add to recent history stack (up to 100 notes, newest first without duplicates)
      setHistoryNotes((prev) => {
        const filtered = prev.filter((item) => item.id !== note.id);
        return [note, ...filtered].slice(0, 100);
      });

      if (pushBrowserHistory && typeof window !== 'undefined') {
        const newUrl = `${window.location.pathname}?note=${encodeURIComponent(note.id)}`;
        window.history.pushState({ noteId: note.id }, '', newUrl);
      }
    } else {
      if (pushBrowserHistory && typeof window !== 'undefined') {
        window.history.pushState({ noteId: null }, '', window.location.pathname);
      }
    }
  }, []);

  // Browser Back/Forward (popstate) listener
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      // If popstate is handled by blog or other sub-view, don't reset wiki note
      if (e.state && 'blogPostId' in e.state) {
        return;
      }
      const noteId = e.state?.noteId;
      if (noteId) {
        const found = notes.find((n) => n.id === noteId);
        if (found) {
          selectNoteWithHistory(found, false);
          return;
        }
      }
      selectNoteWithHistory(null, false);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [notes, selectNoteWithHistory]);

  // Reset all filters
  const handleResetFilters = () => {
    setActiveFilterSlots([]);
    setSelectedCategory(null);
    setSelectedSubCategory(null);
    setSelectedTopic(null);
    setSearchQuery('');
  };

  const handleAddFilterSlot = (slot: ActiveFilterSlot) => {
    setActiveFilterSlots((prev) => {
      if (prev.length >= 20) return prev;
      return [...prev, slot];
    });
  };

  const handleRemoveFilterSlot = (id: string) => {
    setActiveFilterSlots((prev) => prev.filter((s) => s.id !== id));
  };

  const handleClearAllSlots = () => {
    setActiveFilterSlots([]);
  };

  // Toast trigger for uncreated notes
  const showUnresolvedToast = (target: string) => {
    setToastMessage(`아직 작성되지 않은 노트입니다: [[${target}]]`);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Wikilink click navigation handler (Core Feature)
  const handleNavigateWikilink = (target: string) => {
    if (!target) return;
    const clean = target.replace(/^\[\[/, '').replace(/\]\]$/, '').trim().toLowerCase();

    // 1. Try finding a note with matching title, id, or alias
    const matchedNote = notes.find(
      (n) =>
        n.title.toLowerCase() === clean ||
        n.id.toLowerCase() === clean ||
        (n.aliases && n.aliases.some((a) => a.toLowerCase() === clean))
    );

    if (matchedNote) {
      selectNoteWithHistory(matchedNote, true);
      setActiveMenu('wiki');
      return;
    }

    // 2. Try matching Category
    const categoryMatch = Object.keys(taxonomy).find((c) => c.toLowerCase() === clean);
    if (categoryMatch) {
      setSelectedCategory(categoryMatch);
      setSelectedSubCategory(null);
      setSelectedTopic(null);
      selectNoteWithHistory(null, true);
      return;
    }

    // 3. Try matching Topic
    let isTopic = false;
    for (const cat of Object.values(taxonomy)) {
      for (const sub of Object.values(cat.subCategories || {})) {
        if (sub.topics && sub.topics[target]) {
          isTopic = true;
          break;
        }
      }
      if (isTopic) break;
    }

    if (isTopic) {
      setSelectedTopic(target);
      selectNoteWithHistory(null, true);
      return;
    }

    // 4. Fallback: If not found in vault, show clean toast notification!
    showUnresolvedToast(target);
  };

  // Hashtag click handler: filters both MiddleNavColumn Filter Stream and main stream
  const handleSelectHashtag = useCallback((tag: string) => {
    if (!tag) return;
    const cleanTag = tag.replace(/^#/, '').trim();
    if (!cleanTag) return;

    // 1. Set selectedTopic so MiddleNavColumn shows Filter Stream (#Tag)
    setSelectedTopic(cleanTag);

    // 2. Set activeFilterSlots for main stream top filter bar
    setActiveFilterSlots([
      {
        id: `tag-${cleanTag.toLowerCase()}`,
        axis: 'topic',
        topic: cleanTag,
        label: `#${cleanTag}`,
      },
    ]);
  }, []);

  // High performance filtering with Stacked (Union / OR) Multi-Facet Filters & Sorting
  const filteredNotes = useMemo(() => {
    let result = notes;

    const hasSearch = Boolean(searchQuery.trim());

    // When not searching, filter out unlisted sub-item notes (K-Pop Idol, Academic Program, Sports Team)
    // from the general browsing stream
    if (!hasSearch) {
      result = result.filter((n) => !n.unlisted);
    }

    // When filter slots are stacked, note matches if it satisfies ANY of the active slots (Union / OR)
    if (activeFilterSlots.length > 0) {
      result = result.filter((note) => {
        return activeFilterSlots.some((slot) => {
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
            const tNorm = slot.topic.replace(/^#/, '').toLowerCase();
            const tNoHyphen = tNorm.replace(/-/g, ' ');
            const hasTopic =
              (note.topic && (note.topic.toLowerCase() === tNorm || note.topic.toLowerCase() === tNoHyphen)) ||
              (note.topics && note.topics.some((t) => t.toLowerCase() === tNorm || t.toLowerCase() === tNoHyphen)) ||
              (note.tags && note.tags.some((t) => t.toLowerCase() === tNorm || t.toLowerCase() === tNoHyphen));
            if (!hasTopic) match = false;
          }
          return match;
        });
      });
    }

    // Filter by hierarchical / Filter Stream category & subCategory & topic/tag
    if (selectedCategory) {
      result = result.filter((n) => n.category === selectedCategory);
    }
    if (selectedSubCategory) {
      result = result.filter((n) => n.subCategory === selectedSubCategory);
    }
    if (selectedTopic) {
      const tNorm = selectedTopic.replace(/^#/, '').toLowerCase();
      const tNoHyphen = tNorm.replace(/-/g, ' ');
      result = result.filter((n) => {
        if (n.topic && (n.topic.toLowerCase() === tNorm || n.topic.toLowerCase() === tNoHyphen)) return true;
        if (n.topics && n.topics.some((t) => t.toLowerCase() === tNorm || t.toLowerCase() === tNoHyphen)) return true;
        if (n.tags && n.tags.some((t) => t.toLowerCase() === tNorm || t.toLowerCase() === tNoHyphen)) return true;
        return false;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((n) => {
        return (
          n.title.toLowerCase().includes(q) ||
          (n.aliases && n.aliases.some((a) => a.toLowerCase().includes(q))) ||
          (n.topic && n.topic.toLowerCase().includes(q)) ||
          (n.tldr && n.tldr.toLowerCase().includes(q)) ||
          (n.tags && n.tags.some((t) => t.toLowerCase().includes(q))) ||
          (n.cities && n.cities.some((c) => c.toLowerCase().includes(q))) ||
          (n.countries && n.countries.some((c) => c.toLowerCase().includes(q)))
        );
      });
    }

    // Apply Sorting: Random (default), A → Z, Z → A
    if (sortOrder === 'asc') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
    } else if (sortOrder === 'desc') {
      result = [...result].sort((a, b) => b.title.localeCompare(a.title, undefined, { sensitivity: 'base' }));
    } else {
      // Default: 'random'
      result = [...result].sort((a, b) => (randomRanks.get(a.id) ?? 0) - (randomRanks.get(b.id) ?? 0));
    }

    return result;
  }, [notes, activeFilterSlots, selectedCategory, selectedSubCategory, selectedTopic, searchQuery, sortOrder, randomRanks]);

  // Keyboard shortcut: ESC to close detail panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedNote) {
        selectNoteWithHistory(null, true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNote, selectNoteWithHistory]);

  const isDetailOpen = selectedNote !== null && activeMenu === 'wiki';

  if (isLoading) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-white font-mono text-xs text-[#888888] gap-3">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
        <span className="tracking-widest uppercase">Loading XP Seoul Vault...</span>
      </div>
    );
  }

  // --- SUB / EXPERIMENTAL GLOBE VIEW ---
  if (viewMode === 'globe') {
    return (
      <GlobeStreamCanvas
        notes={notes}
        taxonomy={taxonomy}
        knownTitles={knownTitles}
        historyNotes={historyNotes}
        onAddToHistory={(note) => {
          setHistoryNotes((prev) => {
            const filtered = prev.filter((n) => n.id !== note.id);
            return [note, ...filtered].slice(0, 100);
          });
        }}
        onSwitchToStream={() => {
          setViewMode('stream');
          if (typeof window !== 'undefined' && window.location.pathname.startsWith('/globe')) {
            window.history.pushState({}, '', '/');
          }
        }}
        onNavigateWikilink={(target) => handleNavigateWikilink(target)}
        activeFilterSlots={activeFilterSlots}
        onAddFilterSlot={handleAddFilterSlot}
        onRemoveFilterSlot={handleRemoveFilterSlot}
        onClearAllSlots={handleClearAllSlots}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
        onReshuffle={() => setShuffleSeed((s) => s + 1)}
      />
    );
  }

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-white relative">
      {/* --- UNRESOLVED WIKILINK TOAST POPUP --- */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#111111] text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-mono"
          >
            <AlertCircle className="w-4 h-4 text-[#ffaa00]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- TOP GLOBAL NAVIGATION HEADER (When browsing main archive or blog/about) --- */}
      {(!isDetailOpen || !selectedNote) && (
        <header className="w-full flex flex-col bg-white shrink-0 z-40 border-b border-[#eeeeee]">
          <div className="flex items-center justify-between px-4 lg:px-8 py-3">
            {/* Left: Brand & Count & View Switcher */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                onClick={handleResetFilters}
                className="font-black text-xl sm:text-2xl tracking-tight text-black font-sans hover:opacity-75 transition-opacity whitespace-nowrap shrink-0"
              >
                XP Seoul
              </button>

              {/* Archive count - Desktop only */}
              <div className="hidden sm:flex items-center gap-1.5 font-mono text-[11px] text-[#888888] shrink-0">
                <span>Archive</span>
                <span>·</span>
                <span className="font-semibold text-black">{filteredNotes.length.toLocaleString()}</span>
              </div>

              {/* View Mode Switcher Pill */}
              <div className="flex items-center bg-[#f4f4f5] p-0.5 sm:p-1 rounded-full border border-black/8 font-sans text-[11px] sm:text-xs ml-1 sm:ml-2 shrink-0">
                <button
                  onClick={() => setViewMode('stream')}
                  className={`px-2.5 sm:px-3 py-1 rounded-full font-semibold transition-all ${
                    viewMode === 'stream'
                      ? 'bg-white text-black shadow-2xs'
                      : 'text-[#666666] hover:text-black'
                  }`}
                >
                  Stream
                </button>
                <button
                  onClick={() => setViewMode('globe')}
                  className={`px-2.5 sm:px-3.5 py-1 rounded-full font-semibold transition-all ${
                    viewMode === 'globe'
                      ? 'bg-white text-black shadow-2xs'
                      : 'text-[#666666] hover:text-black'
                  }`}
                >
                  Globe
                </button>
              </div>
            </div>

            {/* Desktop Navigation Menu (Wiki, Blog, Magazine, About) */}
            <div className="hidden md:flex items-center gap-6 font-mono text-xs">
              {[
                { id: 'wiki', label: 'Wiki' },
                { id: 'blog', label: 'Blog' },
                { id: 'magazine', label: 'Magazine' },
                { id: 'about', label: 'About' },
              ].map((item) => {
                const isActive = activeMenu === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveMenu(item.id as AppMenu);
                      if (item.id !== 'wiki') selectNoteWithHistory(null, true);
                    }}
                    className={`transition-colors py-1 ${
                      isActive
                        ? 'text-black font-bold border-b-2 border-black'
                        : 'text-[#888888] hover:text-black'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Mobile Menu Toggle Button (Clean without overlapping count) */}
            <div className="md:hidden flex items-center shrink-0">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-1.5 rounded-lg border border-[#e5e5e5] text-black hover:bg-[#f5f5f5] transition-colors"
                aria-label="Open menu"
              >
                <MenuIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Dynamic Faceted Multi-Stack Filter Bar (Desktop only, hidden on mobile per user request) */}
          <div className="hidden md:block">
            {activeMenu === 'wiki' && (
              <MultiFacetFilterBar
                facetData={facetData}
                totalNotesCount={notes.length}
                filteredNotesCount={filteredNotes.length}
                activeFilterSlots={activeFilterSlots}
                onAddFilterSlot={handleAddFilterSlot}
                onRemoveFilterSlot={handleRemoveFilterSlot}
                onClearAllSlots={handleClearAllSlots}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                sortOrder={sortOrder}
                onSortOrderChange={setSortOrder}
                onReshuffle={() => setShuffleSeed((s) => s + 1)}
                isDesktop={true}
              />
            )}
          </div>
        </header>
      )}

      {/* --- MAIN CONTENT CANVAS --- */}
      <main className="flex-1 h-full flex overflow-hidden relative isolate z-0" style={{ zIndex: 1 }}>
        {activeMenu === 'wiki' && !isDetailOpen && (
          // Full-screen wide lens stream on main page without cramped sidebars!
          <div className="flex-1 h-full relative overflow-hidden flex items-center justify-center isolate z-0" style={{ zIndex: 1 }}>
            <MiddleNavColumn
              notes={filteredNotes}
              selectedNote={null}
              historyNotes={historyNotes}
              onSelectNote={(note) => selectNoteWithHistory(note, true)}
              isCompact={false}
            />
          </div>
        )}

        {activeMenu === 'wiki' && isDetailOpen && selectedNote && (
          // Split screen: Unified Nav Column (History + Archive Stream) + Note Detail Canvas
          <div className="flex-1 h-full flex overflow-hidden">
            {/* Desktop Unified Left Nav: Recent History (Top) + Archive Stream (Bottom) */}
            <div className="hidden md:flex h-full shrink-0">
              <MiddleNavColumn
                notes={filteredNotes}
                allNotes={notes}
                selectedNote={selectedNote}
                historyNotes={historyNotes}
                backlinks={backlinks}
                onSelectNote={(note) => selectNoteWithHistory(note, true)}
                isCompact={true}
                onGoHome={() => selectNoteWithHistory(null, true)}
                taxonomy={taxonomy}
                totalNotesCount={notes.length}
                selectedCategory={selectedCategory}
                selectedSubCategory={selectedSubCategory}
                selectedTopic={selectedTopic}
                onSelectCategory={setSelectedCategory}
                onSelectSubCategory={setSelectedSubCategory}
                onSelectTopic={setSelectedTopic}
                onResetFilters={handleResetFilters}
              />
            </div>

            {/* Note Detail Panel (Full on Mobile, 1080px Canvas on Desktop) */}
            <AnimatePresence mode="wait">
              <NoteDetailPanel
                key={selectedNote.id}
                note={selectedNote}
                knownTitles={knownTitles}
                onClose={() => selectNoteWithHistory(null, true)}
                onNavigateWikilink={handleNavigateWikilink}
                onSelectHashtag={handleSelectHashtag}
                onShowUnresolvedToast={showUnresolvedToast}
                isMobile={isMobile}
              />
            </AnimatePresence>

            {/* Desktop Right Column: Slim Minimal Menu Nav ('W', 'B', 'A') */}
            <div className="hidden md:flex shrink-0">
              <MenuNav
                activeMenu={activeMenu}
                onSelectMenu={(menu) => {
                  setActiveMenu(menu);
                  if (menu !== 'wiki') selectNoteWithHistory(null, true);
                }}
                isCompact={true}
              />
            </div>
          </div>
        )}

        {activeMenu === 'blog' && <BlogView />}

        {activeMenu === 'magazine' && <MagazineView />}

        {activeMenu === 'about' && <AboutView />}
      </main>

      {/* --- MOBILE NOTE READING FLOATING CONTROLLER BAR (Glassmorphism Light / Filter - Close - History) --- */}
      <AnimatePresence>
        {isMobile && isDetailOpen && selectedNote && !isMobileSheetOpen && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 280 }}
            style={{ zIndex: 9999 }}
            className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto bg-white/95 backdrop-blur-xl text-black rounded-full px-4 py-2 shadow-[0_12px_36px_rgba(0,0,0,0.16)] flex items-center gap-3 border border-black/10 select-none font-sans"
          >
            {/* 1. Left: Filter Button (Text only, Geist sans) */}
            <button
              onClick={() => {
                setMobileSheetTab('filter');
                setIsMobileSheetOpen(true);
              }}
              className="flex items-center text-[13px] font-sans font-medium text-[#222222] hover:text-black active:opacity-70 transition-colors px-1"
            >
              <span>Filter</span>
              {selectedCategory && (
                <span className="w-1.5 h-1.5 rounded-full bg-black ml-1.5" />
              )}
            </button>

            {/* 2. Center: Close Button (Circular X icon without text) */}
            <button
              onClick={() => selectNoteWithHistory(null, true)}
              className="w-7 h-7 rounded-full bg-black/5 hover:bg-black/10 active:scale-90 flex items-center justify-center text-black transition-all"
              aria-label="Close Note"
            >
              <X className="w-3.5 h-3.5 stroke-[2.2] cursor-pointer" />
            </button>

            {/* 3. Right: History Button (Text only, Geist sans) */}
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

      {/* --- MOBILE MAIN STREAM FLOATING CONTROLLER BAR (검색 | 필터) & CONNECTED SEARCH BAR --- */}
      {isMobile && activeMenu === 'wiki' && !isDetailOpen && !isMobileSheetOpen && (
        <AnimatePresence mode="wait">
          {isMobileSearchOpen ? (
            <motion.div
              key="stream-search-bar"
              initial={{ y: 20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{ zIndex: 9999 }}
              className="md:hidden fixed bottom-6 inset-x-4 max-w-sm mx-auto z-50 pointer-events-auto bg-white/95 backdrop-blur-xl rounded-full px-3.5 py-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.16)] flex items-center gap-2 border border-black/10 select-none font-sans"
            >
              <Search className="w-4 h-4 text-[#888888] shrink-0 ml-1" />
              <input
                type="text"
                autoFocus
                placeholder="Search notes in stream..."
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
              key="stream-control-pill"
              initial={{ y: 20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{ zIndex: 9999 }}
              className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto bg-white/95 backdrop-blur-xl rounded-full px-3.5 py-2 shadow-[0_12px_36px_rgba(0,0,0,0.16)] flex items-center gap-2 border border-black/10 select-none font-sans whitespace-nowrap"
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
                onClick={() => {
                  setMobileSheetTab('filter');
                  setIsMobileSheetOpen(true);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans font-medium transition-all ${
                  activeFilterSlots.length > 0
                    ? 'bg-black text-white shadow-xs'
                    : 'text-[#333333] hover:text-black active:bg-black/5'
                }`}
                aria-label="Open filter"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="truncate max-w-[85px]">
                  {activeFilterSlots.length > 0 ? activeFilterSlots[activeFilterSlots.length - 1].label : '필터'}
                </span>
                {activeFilterSlots.length > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white ml-0.5" />
                )}
              </button>

              {/* Reset Button (only if active filter or search) */}
              {(activeFilterSlots.length > 0 || searchQuery) && (
                <button
                  onClick={handleResetFilters}
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

      {/* --- MOBILE NOTE READING BOTTOM SHEET MODAL (History & Filter) --- */}
      <MobileDetailBottomSheet
        isOpen={isMobile && isMobileSheetOpen}
        activeTab={mobileSheetTab}
        onChangeTab={setMobileSheetTab}
        onClose={() => setIsMobileSheetOpen(false)}
        historyNotes={historyNotes}
        selectedNote={selectedNote}
        notes={filteredNotes}
        facetData={facetData}
        activeFilterSlots={activeFilterSlots}
        onAddFilterSlot={handleAddFilterSlot}
        onRemoveFilterSlot={handleRemoveFilterSlot}
        onClearAllSlots={handleClearAllSlots}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
        onReshuffle={() => setShuffleSeed((s) => s + 1)}
        onSelectNote={(note) => {
          selectNoteWithHistory(note, true);
          setIsMobileSheetOpen(false);
        }}
      />

      {/* --- MOBILE MENU DRAWER MODAL --- */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-end"
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 260 }}
              className="w-[75vw] max-w-[280px] h-full bg-white flex flex-col p-6 shadow-2xl justify-between"
            >
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between pb-4 border-b border-[#eeeeee]">
                  <span className="font-mono text-xs uppercase font-bold">Navigation</span>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-1 rounded-full hover:bg-black/5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-col gap-4 font-mono">
                  {[
                    { id: 'wiki', label: 'Wiki', desc: 'Curated Archive' },
                    { id: 'blog', label: 'Blog', desc: 'Thoughts & Essays' },
                    { id: 'magazine', label: 'Magazine', desc: 'Curations & Lists' },
                    { id: 'about', label: 'About', desc: 'Site Info' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveMenu(item.id as AppMenu);
                        setIsMobileMenuOpen(false);
                        if (item.id !== 'wiki') selectNoteWithHistory(null, true);
                      }}
                      className="text-left py-2 border-b border-[#f5f5f5]"
                    >
                      <div className="text-xl font-bold text-black">{item.label}</div>
                      <div className="text-xs text-[#888888]">{item.desc}</div>
                    </button>
                  ))}

                  {/* Mode switcher inside mobile menu */}
                  <div className="pt-2 flex flex-col gap-2">
                    <span className="text-[11px] uppercase tracking-wider text-[#888888]">View Layout</span>
                    <div className="flex items-center bg-[#f4f4f5] p-1 rounded-full border border-black/8 font-sans text-xs">
                      <button
                        onClick={() => {
                          setViewMode('stream');
                          setIsMobileMenuOpen(false);
                        }}
                        className={`flex-1 py-1.5 rounded-full text-center transition-all ${
                          viewMode === 'stream'
                            ? 'bg-white text-black font-semibold shadow-2xs'
                            : 'text-[#666666]'
                        }`}
                      >
                        Stream
                      </button>
                      <button
                        onClick={() => {
                          setViewMode('globe');
                          setIsMobileMenuOpen(false);
                        }}
                        className={`flex-1 py-1.5 rounded-full text-center transition-all ${
                          viewMode === 'globe'
                            ? 'bg-white text-black font-semibold shadow-2xs'
                            : 'text-[#666666]'
                        }`}
                      >
                        Globe
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="font-mono text-[10px] text-[#aaaaaa]">
                XP Seoul · 2026
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
