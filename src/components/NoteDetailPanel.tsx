import React, { useEffect, useState } from 'react';
import type { NoteItem } from '../types';
import { motion } from 'framer-motion';
import { X, ExternalLink, Globe, MapPin, Layers, Video, Music, Radio } from 'lucide-react';
import { renderFullNoteHtml } from '../utils/markdown';
import { getAllExternalLinks, type ExternalLinkItem } from '../utils/links';

interface NoteDetailPanelProps {
  note: NoteItem;
  onClose: () => void;
  onNavigateWikilink: (target: string) => void;
  isMobile?: boolean;
}

const YouTubeIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

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

export const NoteDetailPanel: React.FC<NoteDetailPanelProps> = ({
  note,
  onClose,
  onNavigateWikilink,
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

  const htmlContent = renderFullNoteHtml(fullNote.rawContent || '');

  // Parse all external link items (IG, Website, URL, Wikis)
  const externalLinks = getAllExternalLinks({
    IG: fullNote.ig,
    Website: fullNote.website,
    ...(fullNote.allProps || {}),
  });

  // Handle click delegation on wikilinks inside rendered markdown
  const handleContainerClick = (e: React.MouseEvent) => {
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

  return (
    <motion.section
      initial={{ opacity: 0, x: isMobile ? 0 : 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: isMobile ? 0 : 30 }}
      transition={{ type: 'spring', damping: 28, stiffness: 280 }}
      onClick={handleContainerClick}
      className={`h-full bg-white flex flex-col overflow-hidden z-30 select-text ${
        isMobile
          ? 'fixed inset-0 w-full'
          : 'flex-1'
      }`}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-6 lg:px-12 py-4 border-b border-[#eeeeee] bg-white/95 backdrop-blur sticky top-0 z-20">
        <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[#888888] truncate">
          <button
            onClick={() => fullNote.category && onNavigateWikilink(fullNote.category)}
            className="text-black font-semibold hover:underline"
          >
            {fullNote.category || 'Wiki'}
          </button>
          {fullNote.subCategory && (
            <>
              <span>/</span>
              <button
                onClick={() => onNavigateWikilink(fullNote.subCategory)}
                className="text-black hover:underline"
              >
                {fullNote.subCategory}
              </button>
            </>
          )}
          {fullNote.topic && (
            <>
              <span>/</span>
              <button
                onClick={() => onNavigateWikilink(fullNote.topic)}
                className="px-2 py-0.5 rounded bg-black text-white text-[10px] font-bold hover:bg-black/80"
              >
                {fullNote.topic}
              </button>
            </>
          )}
        </div>

        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono text-[#555555] hover:text-black hover:bg-[#f2f2f2] transition-colors shrink-0"
        >
          <span>ESC</span>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Scrollable Canvas */}
      <div className="flex-1 overflow-y-auto px-6 lg:px-12 py-8 flex flex-col items-center">
        <div className="w-full max-w-[1080px] flex flex-col gap-8">
          {/* Headline & Title */}
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl lg:text-5xl font-black tracking-[-0.04em] text-black leading-[1.08] font-sans">
              {fullNote.title}
            </h1>

            {fullNote.aliases && fullNote.aliases.length > 0 && (
              <p className="font-sans text-sm lg:text-base text-[#777777]">
                aka {fullNote.aliases.join(', ')}
              </p>
            )}
          </div>

          {/* Action Row: External Links + City/Country Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-4 border-b border-[#eeeeee]">
            {/* Left: External Link Buttons */}
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

          {/* Properties Table (Every value is a clickable wikilink!) */}
          {fullNote.allProps && Object.keys(fullNote.allProps).length > 0 && (
            <div className="flex flex-col border border-[#eeeeee] rounded-xl overflow-hidden text-xs">
              <div className="px-4 py-2 bg-[#fafafa] border-b border-[#eeeeee] font-mono text-[10px] uppercase tracking-wider text-[#888888] font-bold flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-black" />
                <span>Note Properties</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#eeeeee] bg-white">
                <div className="flex flex-col divide-y divide-[#eeeeee]">
                  {Object.entries(fullNote.allProps)
                    .slice(0, Math.ceil(Object.keys(fullNote.allProps).length / 2))
                    .map(([k, v]) => (
                      <div key={k} className="flex items-center px-4 py-2 gap-4">
                        <span className="font-mono text-[11px] text-[#777777] w-28 shrink-0">{k}</span>
                        <div className="flex flex-wrap gap-1 items-center">
                          {Array.isArray(v) ? (
                            v.map((item, i) => (
                              <button
                                key={i}
                                onClick={() => onNavigateWikilink(item)}
                                className="font-sans text-black hover:underline hover:bg-black/5 px-1 py-0.5 rounded text-left transition-colors"
                              >
                                {item}
                              </button>
                            ))
                          ) : (
                            <button
                              onClick={() => onNavigateWikilink(String(v))}
                              className="font-sans text-black hover:underline hover:bg-black/5 px-1 py-0.5 rounded text-left transition-colors"
                            >
                              {String(v)}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
                <div className="flex flex-col divide-y divide-[#eeeeee]">
                  {Object.entries(fullNote.allProps)
                    .slice(Math.ceil(Object.keys(fullNote.allProps).length / 2))
                    .map(([k, v]) => (
                      <div key={k} className="flex items-center px-4 py-2 gap-4">
                        <span className="font-mono text-[11px] text-[#777777] w-28 shrink-0">{k}</span>
                        <div className="flex flex-wrap gap-1 items-center">
                          {Array.isArray(v) ? (
                            v.map((item, i) => (
                              <button
                                key={i}
                                onClick={() => onNavigateWikilink(item)}
                                className="font-sans text-black hover:underline hover:bg-black/5 px-1 py-0.5 rounded text-left transition-colors"
                              >
                                {item}
                              </button>
                            ))
                          ) : (
                            <button
                              onClick={() => onNavigateWikilink(String(v))}
                              className="font-sans text-black hover:underline hover:bg-black/5 px-1 py-0.5 rounded text-left transition-colors"
                            >
                              {String(v)}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Full Markdown Body (Separate Callouts, Headings, Inline Code, Lists, Iframes) */}
          <div
            className="prose-obsidian w-full"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="px-6 lg:px-12 py-3 bg-[#fbfbfb] border-t border-[#eeeeee] flex items-center justify-between text-[11px] font-mono text-[#888888]">
        <span>Obsidian Note: {fullNote.id}</span>
        <span>1080px Canvas View</span>
      </div>
    </motion.section>
  );
};
