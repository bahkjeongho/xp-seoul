import React, { useEffect, useState, useMemo } from 'react';
import type { NoteItem } from '../types';
import { motion } from 'framer-motion';
import { X, ExternalLink, Globe, MapPin, Music, Radio, Link as LinkIcon } from 'lucide-react';
import { renderFullNoteHtml } from '../utils/markdown';
import { getAllExternalLinks, type ExternalLinkItem } from '../utils/links';
import { useLenisScroll } from '../hooks/useLenisScroll';

interface NoteDetailPanelProps {
  note: NoteItem;
  knownTitles?: Set<string>;
  onClose: () => void;
  onNavigateWikilink: (target: string) => void;
  onShowUnresolvedToast?: (target: string) => void;
  isMobile?: boolean;
}

const InstagramIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const TwitterIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const LinkedInIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.25c-.9 0-1.63.73-1.63 1.63 0 .9.73 1.63 1.63 1.63.9 0 1.63-.73 1.63-1.63 0-.9-.73-1.63-1.63-1.63z" />
  </svg>
);

const YouTubeIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

export const NoteDetailPanel: React.FC<NoteDetailPanelProps> = ({
  note,
  knownTitles,
  onClose,
  onNavigateWikilink,
  onShowUnresolvedToast,
  isMobile = false,
}) => {
  const [fullNote, setFullNote] = useState<NoteItem>(note);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load complete note data from public/data/notes/<hash>.json
  useEffect(() => {
    setIsLoading(true);
    fetch(`/data/notes/${note.hash}.json`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((data: NoteItem) => {
        setFullNote(data);
        setIsLoading(false);
      })
      .catch(() => {
        setFullNote(note);
        setIsLoading(false);
      });
  }, [note.hash]);

  // Render markdown with full video embed & wikilink resolution
  const htmlContent = useMemo(() => {
    return renderFullNoteHtml(fullNote.rawContent || '', knownTitles);
  }, [fullNote.rawContent, knownTitles]);

  // External Links (IG, Website, URL, Wikis)
  const externalLinks = useMemo(() => {
    return getAllExternalLinks({
      IG: fullNote.ig,
      Website: fullNote.website,
      ...(fullNote.allProps || {}),
    });
  }, [fullNote]);

  // Handle click delegation on wikilinks
  const handleContainerClick = (e: React.MouseEvent) => {
    const unresolvedEl = (e.target as HTMLElement).closest('[data-unresolved-wikilink]') as HTMLElement | null;
    if (unresolvedEl) {
      e.preventDefault();
      const target = unresolvedEl.getAttribute('data-unresolved-wikilink');
      if (target && onShowUnresolvedToast) {
        onShowUnresolvedToast(target);
      }
      return;
    }

    const linkEl = (e.target as HTMLElement).closest('[data-wikilink]') as HTMLElement | null;
    if (linkEl) {
      e.preventDefault();
      const target = linkEl.getAttribute('data-wikilink');
      if (target) {
        onNavigateWikilink(target);
      }
    }
  };

  const renderLinkIcon = (type: ExternalLinkItem['type']) => {
    switch (type) {
      case 'instagram':
        return <InstagramIcon />;
      case 'twitter':
        return <TwitterIcon />;
      case 'youtube':
        return <YouTubeIcon />;
      case 'linkedin':
        return <LinkedInIcon />;
      case 'spotify':
        return <Music className="w-3.5 h-3.5" />;
      case 'soundcloud':
      case 'bandcamp':
        return <Radio className="w-3.5 h-3.5" />;
      default:
        return <Globe className="w-3.5 h-3.5" />;
    }
  };

  // Collect taxonomy items (excluding Topic which gets prominent display)
  const taxonomyItems = useMemo(() => {
    const items: { label: string; value: string }[] = [];
    if (fullNote.category) items.push({ label: 'Category', value: fullNote.category });
    if (fullNote.subCategory) items.push({ label: 'Sub-Category', value: fullNote.subCategory });
    if (fullNote.field) items.push({ label: 'Field', value: fullNote.field });
    if (fullNote.subField) items.push({ label: 'Sub-Field', value: fullNote.subField });
    if (fullNote.type) items.push({ label: 'Type', value: fullNote.type });
    if (fullNote.subType) items.push({ label: 'Sub-Type', value: fullNote.subType });
    return items;
  }, [fullNote]);

  // Extract Related and Tags
  const relatedList: string[] = useMemo(() => {
    const raw = fullNote.allProps?.Related;
    if (!raw) return [];
    const arr = Array.isArray(raw) ? raw : [raw];
    return arr.map(r => String(r).replace(/^\[\[/, '').replace(/\]\]$/, '').trim()).filter(Boolean);
  }, [fullNote.allProps]);

  const tagsList: string[] = useMemo(() => {
    const raw = fullNote.allProps?.tags || fullNote.allProps?.tag;
    if (!raw) return [];
    const arr = Array.isArray(raw) ? raw : [raw];
    return arr.map(t => String(t).replace(/^\[\[/, '').replace(/\]\]$/, '').replace(/^#/, '').trim()).filter(Boolean);
  }, [fullNote.allProps]);

  // Lenis smooth scrolling for Note Detail reading container
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  useLenisScroll(scrollContainerRef, [fullNote.id]);

  return (
    <motion.section
      initial={{ opacity: 0, x: isMobile ? 0 : 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: isMobile ? 0 : 30 }}
      transition={{ type: 'spring', damping: 28, stiffness: 280 }}
      onClick={handleContainerClick}
      className={`h-full bg-white flex flex-col overflow-hidden z-30 select-text ${
        isMobile ? 'fixed inset-0 w-full' : 'flex-1'
      }`}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-6 lg:px-12 py-3.5 border-b border-[#eeeeee] bg-white/95 backdrop-blur sticky top-0 z-20">
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-[#888888]">
          <span className="text-black font-semibold">XP Seoul Note</span>
          <span>·</span>
          <span>{fullNote.id}</span>
        </div>

        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono text-[#555555] hover:text-black hover:bg-[#f2f2f2] transition-colors shrink-0"
        >
          <span>ESC</span>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Scrollable Canvas with Lenis integration */}
      <div
        ref={scrollContainerRef}
        className={`flex-1 overflow-y-auto px-6 lg:px-12 py-8 flex flex-col items-center ${isMobile ? 'pb-28' : ''}`}
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="w-full max-w-[1080px] flex flex-col gap-6">

          {/* (1) Title Row & Top Right Taxonomy Hierarchy Buttons */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pt-2">
            {/* Title & Aliases (NO "aka " prefix!) */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-0 pr-4">
              <h1 className="text-3xl lg:text-5xl font-black tracking-[-0.04em] text-black leading-[1.08] font-sans break-words">
                {fullNote.title}
              </h1>

              {fullNote.aliases && fullNote.aliases.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-sm lg:text-base text-[#666666] font-sans">
                  {fullNote.aliases.map((alias, idx) => (
                    <span key={idx}>
                      {alias}
                      {idx < fullNote.aliases.length - 1 && ' · '}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Prominent Topic + Category/Field/Type Buttons */}
            <div className="flex flex-col md:items-end gap-2 shrink-0">
              {/* Prominent Topic Pill */}
              {fullNote.topic && (
                <button
                  onClick={() => onNavigateWikilink(fullNote.topic)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-black text-white hover:bg-black/80 font-mono text-xs font-bold tracking-wider uppercase transition-colors"
                >
                  <span>{fullNote.topic}</span>
                </button>
              )}

              {/* Taxonomy Attribute Buttons */}
              {taxonomyItems.length > 0 && (
                <div className="flex flex-wrap md:justify-end gap-1.5">
                  {taxonomyItems.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => onNavigateWikilink(item.value)}
                      title={item.label}
                      className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#f4f4f5] hover:bg-black hover:text-white text-[#444444] font-mono text-[11px] transition-colors"
                    >
                      <span>{item.value}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* (2) & (3) Unified Action & Metadata Container (Web Links, Location, Related, Tags) */}
          <div className="flex flex-col border-y border-[#eeeeee]">
            {/* Top Sub-row: Web Shortcuts & Location */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 py-2.5">
              {/* Left: Web Links Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {externalLinks.map((link, idx) => (
                  <a
                    key={idx}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f6f6f7] hover:bg-black hover:text-white rounded-md text-xs font-mono transition-colors"
                  >
                    {renderLinkIcon(link.type)}
                    <span>{link.label}</span>
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  </a>
                ))}
              </div>

              {/* Right: Location Button (City, Country) */}
              {(fullNote.cities?.length > 0 || fullNote.countries?.length > 0) && (
                <button
                  onClick={() => {
                    const targetLoc = fullNote.cities?.[0] || fullNote.countries?.[0];
                    if (targetLoc) onNavigateWikilink(targetLoc);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f6f6f7] hover:bg-black hover:text-white rounded-md text-xs font-mono text-[#333333] transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#888888]" />
                  <span>
                    {[...(fullNote.cities || []), ...(fullNote.countries || [])].join(', ')}
                  </span>
                </button>
              )}
            </div>

            {/* Bottom Sub-row: Related & Tags (Separated by subtle border, perfectly vertically centered) */}
            {(relatedList.length > 0 || tagsList.length > 0) && (
              <div className="border-t border-[#f0f0f0] py-2 flex flex-wrap items-center gap-4 text-xs font-mono min-h-[34px]">
                {relatedList.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[#888888] uppercase tracking-wider text-[11px] font-mono leading-none select-none flex items-center">
                      RELATED:
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {relatedList.map((rel, idx) => (
                        <button
                          key={idx}
                          onClick={() => onNavigateWikilink(rel)}
                          className="inline-flex items-center px-2 py-0.5 rounded bg-[#f5f5f7] hover:bg-black hover:text-white text-black text-xs font-mono transition-colors leading-none"
                        >
                          {rel}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {tagsList.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[#888888] uppercase tracking-wider text-[11px] font-mono leading-none select-none flex items-center">
                      TAGS:
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {tagsList.map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#fafafa] border border-[#eeeeee] text-[#555555] text-xs font-mono leading-none"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* (4) Full Markdown Body (Callouts, Headings, Iframes, Video Players) */}
          <div
            className="prose-obsidian w-full pt-2"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="px-6 lg:px-12 py-2.5 bg-[#fbfbfb] border-t border-[#eeeeee] flex items-center justify-between text-[11px] font-mono text-[#888888]">
        <span>Obsidian Note Document</span>
        <span>1080px Canvas View</span>
      </div>
    </motion.section>
  );
};
