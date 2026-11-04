import React, { useState, useMemo, useEffect } from 'react';
import type { NoteItem, TaxonomyData } from '../types';
import { FilterSidebar } from './FilterSidebar';
import { ScrollLensStream } from './ScrollLensStream';
import { NoteDetailPanel } from './NoteDetailPanel';
import { MenuNav } from './MenuNav';
import { BlogView } from './BlogView';
import { AboutView } from './AboutView';
import { AnimatePresence } from 'framer-motion';

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

  // Client-side fetch fallback if props were not provided at SSR
  useEffect(() => {
    if (notes.length === 0) {
      Promise.all([
        fetch('/data/notes-light.json').then(r => r.json()),
        fetch('/data/taxonomy.json').then(r => r.json()),
      ]).then(([notesData, taxData]) => {
        setNotes(notesData);
        setTaxonomy(taxData);
        setIsLoading(false);
      }).catch(err => {
        console.error('Failed to load local data:', err);
        setIsLoading(false);
      });
    }
  }, [notes.length]);

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedCategory(null);
    setSelectedSubCategory(null);
    setSelectedTopic(null);
    setSearchQuery('');
  };

  // High performance filtering
  const filteredNotes = useMemo(() => {
    let result = notes;

    if (selectedCategory) {
      result = result.filter(n => n.category === selectedCategory);
    }
    if (selectedSubCategory) {
      result = result.filter(n => n.subCategory === selectedSubCategory);
    }
    if (selectedTopic) {
      result = result.filter(n => n.topic === selectedTopic || (n.topics && n.topics.includes(selectedTopic)));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(n => {
        return (
          n.title.toLowerCase().includes(q) ||
          (n.aliases && n.aliases.some(a => a.toLowerCase().includes(q))) ||
          (n.topic && n.topic.toLowerCase().includes(q)) ||
          (n.tldr && n.tldr.toLowerCase().includes(q)) ||
          (n.cities && n.cities.some(c => c.toLowerCase().includes(q)))
        );
      });
    }

    return result;
  }, [notes, selectedCategory, selectedSubCategory, selectedTopic, searchQuery]);

  // Keyboard shortcut: ESC to close detail panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedNote) {
        setSelectedNote(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNote]);

  const isDetailOpen = selectedNote !== null && activeMenu === 'wiki';

  if (isLoading) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-white font-mono text-xs text-[#888888] gap-3">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
        <span className="tracking-widest uppercase">Indexing XP Seoul Archive...</span>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen flex overflow-hidden bg-white">
      {/* 1. Left Column: Filter Hierarchy */}
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

      {/* 2. Center Content Area (Dynamic based on Menu) */}
      <main className="flex-1 h-full flex overflow-hidden relative">
        {activeMenu === 'wiki' && (
          <ScrollLensStream
            notes={filteredNotes}
            selectedNote={selectedNote}
            onSelectNote={(note) => setSelectedNote(note)}
            isCompact={isDetailOpen}
          />
        )}

        {activeMenu === 'blog' && (
          <BlogView />
        )}

        {activeMenu === 'about' && (
          <AboutView />
        )}

        {/* 3. Detail Split Panel (Opens on Right 50% when a note is selected) */}
        <AnimatePresence>
          {isDetailOpen && selectedNote && (
            <NoteDetailPanel
              note={selectedNote}
              onClose={() => setSelectedNote(null)}
            />
          )}
        </AnimatePresence>
      </main>

      {/* 4. Right Column: Menu Navigation */}
      <MenuNav
        activeMenu={activeMenu}
        onSelectMenu={(menu) => {
          setActiveMenu(menu);
          if (menu !== 'wiki') setSelectedNote(null);
        }}
        isCompact={isDetailOpen}
      />
    </div>
  );
};
