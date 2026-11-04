import React, { useEffect, useState } from 'react';
import type { NoteItem } from '../types';
import { motion } from 'framer-motion';
import { X, ExternalLink, Globe, Tag, MapPin, Building, Sparkles, Layers } from 'lucide-react';
import { renderObsidianMarkdown } from '../utils/markdown';

interface NoteDetailPanelProps {
  note: NoteItem;
  onClose: () => void;
}

const InstagramIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

export const NoteDetailPanel: React.FC<NoteDetailPanelProps> = ({ note, onClose }) => {
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

  const htmlContent = renderObsidianMarkdown(fullNote.rawContent || '');

  return (
    <motion.section
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ type: 'spring', damping: 30, stiffness: 280 }}
      className="flex-1 h-full bg-white flex flex-col overflow-hidden z-30 select-text"
    >
      {/* Top Sticky Header */}
      <div className="flex items-center justify-between px-8 lg:px-14 py-5 border-b border-[#eeeeee] bg-white/95 backdrop-blur sticky top-0 z-20">
        <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[#888888]">
          <span className="text-black font-semibold">{fullNote.category || 'Wiki'}</span>
          {fullNote.subCategory && (
            <>
              <span>/</span>
              <span className="text-black">{fullNote.subCategory}</span>
            </>
          )}
          {fullNote.topic && (
            <>
              <span>/</span>
              <span className="px-2 py-0.5 rounded bg-black text-white text-[10px] font-bold">
                {fullNote.topic}
              </span>
            </>
          )}
        </div>

        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono text-[#555555] hover:text-black hover:bg-[#f2f2f2] transition-colors"
        >
          <span>ESC</span>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Scrollable Canvas (Width tailored to 1080px for embeds) */}
      <div className="flex-1 overflow-y-auto px-6 lg:px-14 py-10 flex flex-col items-center">
        <div className="w-full max-w-[1080px] flex flex-col gap-8">
          {/* Headline & Title Section (i-D Magazine Inspired) */}
          <div className="flex flex-col gap-3">
            <h1 className="text-4xl lg:text-6xl font-black tracking-[-0.04em] text-black leading-[1.05] font-sans">
              {fullNote.title}
            </h1>

            {fullNote.aliases && fullNote.aliases.length > 0 && (
              <p className="font-sans text-base text-[#777777]">
                aka {fullNote.aliases.join(', ')}
              </p>
            )}
          </div>

          {/* Quick External Links Row */}
          <div className="flex flex-wrap items-center gap-2.5 pb-4 border-b border-[#eeeeee]">
            {fullNote.ig && (
              <a
                href={fullNote.ig}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f6f6f7] hover:bg-black hover:text-white rounded-md text-xs font-mono transition-colors"
              >
                <InstagramIcon />
                <span>Instagram</span>
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            )}

            {fullNote.website && (
              <a
                href={fullNote.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f6f6f7] hover:bg-black hover:text-white rounded-md text-xs font-mono transition-colors"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Website</span>
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            )}

            {fullNote.cities && fullNote.cities.length > 0 && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f6f6f7] text-[#444444] rounded-md text-xs font-mono">
                <MapPin className="w-3.5 h-3.5 text-[#888888]" />
                <span>{fullNote.cities.join(', ')}</span>
                {fullNote.countries && fullNote.countries.length > 0 && (
                  <span>({fullNote.countries.join(', ')})</span>
                )}
              </div>
            )}

            {fullNote.labels && fullNote.labels.length > 0 && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f6f6f7] text-[#444444] rounded-md text-xs font-mono">
                <Building className="w-3.5 h-3.5 text-[#888888]" />
                <span>{fullNote.labels.join(', ')}</span>
              </div>
            )}
          </div>

          {/* Comprehensive Property Spec Table (Like Hide-Park & Quartz Note Properties) */}
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
                        <span className="font-sans text-black truncate">
                          {Array.isArray(v) ? v.join(', ') : String(v)}
                        </span>
                      </div>
                    ))}
                </div>
                <div className="flex flex-col divide-y divide-[#eeeeee]">
                  {Object.entries(fullNote.allProps)
                    .slice(Math.ceil(Object.keys(fullNote.allProps).length / 2))
                    .map(([k, v]) => (
                      <div key={k} className="flex items-center px-4 py-2 gap-4">
                        <span className="font-mono text-[11px] text-[#777777] w-28 shrink-0">{k}</span>
                        <span className="font-sans text-black truncate">
                          {Array.isArray(v) ? v.join(', ') : String(v)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Full Rich Markdown Body (With <iframe>, <video>, tables, and callouts intact) */}
          <div
            className="prose prose-neutral max-w-none w-full text-[#111111] font-sans leading-relaxed
              prose-headings:font-bold prose-headings:tracking-tight
              prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl
              prose-p:leading-relaxed prose-p:text-base
              [&_iframe]:max-w-full [&_iframe]:rounded-2xl [&_iframe]:border [&_iframe]:border-black/10 [&_iframe]:shadow-sm
              [&_video]:max-w-full [&_video]:rounded-2xl [&_video]:border [&_video]:border-black/10
              [&_table]:w-full [&_table]:border [&_table]:border-[#eeeeee] [&_table]:rounded-lg
              [&_th]:bg-[#fafafa] [&_th]:p-3 [&_th]:font-mono [&_th]:text-xs [&_th]:border-b [&_th]:border-[#eeeeee]
              [&_td]:p-3 [&_td]:border-b [&_td]:border-[#eeeeee] [&_td]:text-sm"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
      </div>

      {/* Bottom Sticky Status */}
      <div className="px-8 lg:px-14 py-3 bg-[#fbfbfb] border-t border-[#eeeeee] flex items-center justify-between text-[11px] font-mono text-[#888888]">
        <span>Obsidian Vault Document</span>
        <span>Target Width: 1080px Canvas</span>
      </div>
    </motion.section>
  );
};
