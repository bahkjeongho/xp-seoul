import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { NoteItem, TaxonomyData } from '../types';
import { FilterSidebar } from './FilterSidebar';
import { MobileFilterBar } from './MobileFilterBar';
import { MiddleNavColumn } from './MiddleNavColumn';
import { NoteDetailPanel } from './NoteDetailPanel';
import { MenuNav } from './MenuNav';
import { BlogView } from './BlogView';
import { AboutView } from './AboutView';
import { AnimatePresence, motion } from 'framer-motion';
import { SlidersHorizontal, Menu as MenuIcon, X, AlertCircle } from 'lucide-react';

interface XPSeoulAppProps {
  initialNotes?: NoteItem[];
  initialTaxonomy?: TaxonomyData;
}

export const XPSeoulApp: React.FC<XPSeoulAppProps> = ({
  initialNotes = [],
  initialTaxonomy = {},
}) => {
  const [notes, setNotes] = useState<NoteItem[]>(initialNotes);
  const [taxonomy, setTaxonomy] = useState<TaxonomyData>(initialTaxonomy);
  const [isLoading, setIsLoading] = useState<boolean>(initialNotes.length === 0);

  // Filters State
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Navigation & Detail State
  const [activeMenu, setActiveMenu] = useState<'wiki' | 'blog' | 'about'>('wiki');
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);

  // Visited History Stack (last 10 notes)
  const [historyNotes, setHistoryNotes] = useState<NoteItem[]>([]);

  // Toast notification for unresolved notes
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Mobile Drawer State
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

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

  // Read initial note from URL (?note=...) on first mount
  useEffect(() => {
    if (notes.length > 0 && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const noteParam = urlParams.get('note');
      if (noteParam) {
        const found = notes.find(
          (n) => n.id.toLowerCase() === noteParam.toLowerCase() || n.title.toLowerCase() === noteParam.toLowerCase()
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
    setSelectedCategory(null);
    setSelectedSubCategory(null);
    setSelectedTopic(null);
    setSearchQuery('');
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

  // High performance filtering
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
      result = result.filter((n) => {
        return (
          n.title.toLowerCase().includes(q) ||
          (n.aliases && n.aliases.some((a) => a.toLowerCase().includes(q))) ||
          (n.topic && n.topic.toLowerCase().includes(q)) ||
          (n.tldr && n.tldr.toLowerCase().includes(q)) ||
          (n.cities && n.cities.some((c) => c.toLowerCase().includes(q)))
        );
      });
    }

    return result;
  }, [notes, selectedCategory, selectedSubCategory, selectedTopic, searchQuery]);

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

  return (
    <div className="w-screen h-screen flex flex-col md:flex-row overflow-hidden bg-white relative">
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

      {/* --- MOBILE TOP NAVIGATION BAR (< 768px) --- */}
      <div className="md:hidden flex flex-col bg-white z-40 shrink-0">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#eeeeee]">
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetFilters}
              className="font-black text-xl tracking-tight text-black font-sans"
            >
              XP Seoul
            </button>
            <span className="font-mono text-[10px] text-[#888888]">
              · {filteredNotes.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 rounded-lg border border-[#e5e5e5] text-black hover:bg-[#f5f5f5] transition-colors"
              aria-label="Open menu"
            >
              <MenuIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dynamic Hierarchical Button Filter Bar (Level 1 -> 2 -> 3) on Mobile Main Page */}
        {activeMenu === 'wiki' && !selectedNote && (
          <MobileFilterBar
            taxonomy={taxonomy}
            totalNotesCount={notes.length}
            filteredNotesCount={filteredNotes.length}
            selectedCategory={selectedCategory}
            selectedSubCategory={selectedSubCategory}
            selectedTopic={selectedTopic}
            searchQuery={searchQuery}
            onSelectCategory={setSelectedCategory}
            onSelectSubCategory={setSelectedSubCategory}
            onSelectTopic={setSelectedTopic}
            onSearchChange={setSearchQuery}
            onReset={handleResetFilters}
          />
        )}
      </div>

      {/* --- DESKTOP LEFT COLUMN: Organic Filter Sidebar (Hidden on Mobile) --- */}
      <div className="hidden md:flex">
        <FilterSidebar
          taxonomy={taxonomy}
          totalNotesCount={notes.length}
          filteredNotesCount={filteredNotes.length}
          selectedCategory={selectedCategory}
          selectedSubCategory={selectedSubCategory}
          selectedTopic={selectedTopic}
          searchQuery={searchQuery}
          onSelectCategory={setSelectedCategory}
          onSelectSubCategory={setSelectedSubCategory}
          onSelectTopic={setSelectedTopic}
          onSearchChange={setSearchQuery}
          onReset={handleResetFilters}
          isCompact={isDetailOpen}
        />
      </div>

      {/* --- CENTER / MAIN CONTENT CANVAS --- */}
      <main className="flex-1 h-full flex overflow-hidden relative">
        {activeMenu === 'wiki' && (
          <MiddleNavColumn
            notes={filteredNotes}
            selectedNote={selectedNote}
            historyNotes={historyNotes}
            onSelectNote={(note) => selectNoteWithHistory(note, true)}
            isCompact={isDetailOpen}
          />
        )}

        {activeMenu === 'blog' && <BlogView />}

        {activeMenu === 'about' && <AboutView />}

        {/* --- DESKTOP & MOBILE NOTE DETAIL PANEL (1080px Canvas View) --- */}
        <AnimatePresence>
          {isDetailOpen && selectedNote && (
            <NoteDetailPanel
              note={selectedNote}
              knownTitles={knownTitles}
              onClose={() => selectNoteWithHistory(null, true)}
              onNavigateWikilink={handleNavigateWikilink}
              onShowUnresolvedToast={showUnresolvedToast}
              isMobile={isMobile}
            />
          )}
        </AnimatePresence>
      </main>

      {/* --- DESKTOP RIGHT COLUMN: Menu Navigation (Hidden on Mobile) --- */}
      <div className="hidden md:flex">
        <MenuNav
          activeMenu={activeMenu}
          onSelectMenu={(menu) => {
            setActiveMenu(menu);
            if (menu !== 'wiki') selectNoteWithHistory(null, true);
          }}
          isCompact={isDetailOpen}
        />
      </div>

      {/* --- MOBILE FILTER DRAWER MODAL --- */}
      <AnimatePresence>
        {isMobileFilterOpen && (
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
              className="w-[85vw] max-w-[340px] h-full bg-white flex flex-col p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#eeeeee]">
                <span className="font-mono text-xs uppercase font-bold">Filter Categories</span>
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="p-1 rounded-full hover:bg-black/5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pt-4">
                <FilterSidebar
                  taxonomy={taxonomy}
                  totalNotesCount={notes.length}
                  filteredNotesCount={filteredNotes.length}
                  selectedCategory={selectedCategory}
                  selectedSubCategory={selectedSubCategory}
                  selectedTopic={selectedTopic}
                  searchQuery={searchQuery}
                  onSelectCategory={(cat) => {
                    setSelectedCategory(cat);
                  }}
                  onSelectSubCategory={(sub) => {
                    setSelectedSubCategory(sub);
                  }}
                  onSelectTopic={(top) => {
                    setSelectedTopic(top);
                    setIsMobileFilterOpen(false);
                  }}
                  onSearchChange={setSearchQuery}
                  onReset={handleResetFilters}
                  isCompact={false}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                    { id: 'about', label: 'About', desc: 'Site Info' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveMenu(item.id as any);
                        setIsMobileMenuOpen(false);
                        if (item.id !== 'wiki') selectNoteWithHistory(null, true);
                      }}
                      className="text-left py-2 border-b border-[#f5f5f5]"
                    >
                      <div className="text-xl font-bold text-black">{item.label}</div>
                      <div className="text-xs text-[#888888]">{item.desc}</div>
                    </button>
                  ))}
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
