import React from 'react';
import type { NoteItem } from '../types';
import { motion } from 'framer-motion';
import { X, ExternalLink, Globe, Tag, MapPin, Building, Sparkles } from 'lucide-react';

const InstagramIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

interface NoteDetailPanelProps {
  note: NoteItem;
  onClose: () => void;
}

export const NoteDetailPanel: React.FC<NoteDetailPanelProps> = ({ note, onClose }) => {
  return (
    <motion.section
      initial={{ x: 60, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 60, opacity: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 260 }}
      className="w-full lg:w-1/2 h-full bg-white border-l border-[#e5e5e5] flex flex-col overflow-hidden z-30 shadow-[-16px_0_40px_rgba(0,0,0,0.04)]"
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-[#eeeeee] bg-white sticky top-0 z-20">
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-[#888888]">
          <span>{note.category || 'Wiki'}</span>
          {note.subCategory && (
            <>
              <span>/</span>
              <span className="text-black font-medium">{note.subCategory}</span>
            </>
          )}
          {note.field && (
            <>
              <span>/</span>
              <span>{note.field}</span>
            </>
          )}
        </div>

        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono text-[#666666] hover:text-black hover:bg-[#f2f2f2] transition-colors"
        >
          <span>ESC</span>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Scrollable Content Container */}
      <div className="flex-1 overflow-y-auto px-8 py-8 flex flex-col gap-8">
        {/* Editorial Headline Section (i-D Inspired) */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {note.topic && (
              <span className="font-mono text-[10px] uppercase tracking-widest px-2.5 py-1 bg-black text-white font-semibold rounded">
                {note.topic}
              </span>
            )}
            {note.type && (
              <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border border-[#cccccc] text-[#666666] rounded">
                {note.type}
              </span>
            )}
          </div>

          <h1 className="text-3xl lg:text-5xl font-black tracking-[-0.04em] text-black leading-[1.05] font-sans mt-2">
            {note.title}
          </h1>

          {note.aliases && note.aliases.length > 0 && (
            <p className="font-sans text-sm text-[#777777] font-normal">
              aka {note.aliases.join(', ')}
            </p>
          )}
        </div>

        {/* Selected Properties Row (Instagram, Website, Genres, Location) */}
        <div className="flex flex-wrap gap-2.5 pt-4 pb-4 border-y border-[#eeeeee]">
          {note.ig && (
            <a
              href={note.ig}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f6f6f7] hover:bg-black hover:text-white rounded-md text-xs font-mono transition-colors"
            >
              <InstagramIcon />
              <span>Instagram</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          )}

          {note.website && (
            <a
              href={note.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f6f6f7] hover:bg-black hover:text-white rounded-md text-xs font-mono transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Website</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          )}

          {note.cities.length > 0 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f6f6f7] text-[#444444] rounded-md text-xs font-mono">
              <MapPin className="w-3.5 h-3.5 text-[#888888]" />
              <span>{note.cities.join(', ')}</span>
              {note.countries.length > 0 && <span>({note.countries.join(', ')})</span>}
            </div>
          )}

          {note.labels && note.labels.length > 0 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f6f6f7] text-[#444444] rounded-md text-xs font-mono">
              <Building className="w-3.5 h-3.5 text-[#888888]" />
              <span>{note.labels.join(', ')}</span>
            </div>
          )}

          {note.genres && note.genres.length > 0 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f6f6f7] text-[#444444] rounded-md text-xs font-mono">
              <Tag className="w-3.5 h-3.5 text-[#888888]" />
              <span>{note.genres.join(', ')}</span>
            </div>
          )}
        </div>

        {/* tl;dr Callout Box */}
        {note.tldr && (
          <div className="p-5 bg-[#f8f8fa] border-l-2 border-black rounded-r-lg flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#888888] font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-black" />
              <span>TL;DR Overview</span>
            </span>
            <p className="text-sm lg:text-base text-[#111111] leading-relaxed font-sans font-normal">
              {note.tldr}
            </p>
          </div>
        )}

        {/* Info Callout */}
        {note.info && (
          <div className="flex flex-col gap-2">
            <h4 className="font-mono text-[11px] uppercase tracking-wider text-[#888888] font-semibold">
              Background / Context
            </h4>
            <div className="text-sm text-[#333333] leading-relaxed font-sans p-4 bg-[#fbfbfb] rounded-lg border border-[#f0f0f0]">
              {note.info}
            </div>
          </div>
        )}

        {/* Summary or Additional Markdown Snippets */}
        {note.rawContent && (
          <div className="flex flex-col gap-3 pt-2">
            <h4 className="font-mono text-[11px] uppercase tracking-wider text-[#888888] font-semibold border-b border-[#eeeeee] pb-2">
              Note Notes & Body
            </h4>
            <div className="prose prose-sm max-w-none text-[#222222] font-sans leading-relaxed whitespace-pre-wrap">
              {note.rawContent
                .replace(/^---[\s\S]*?---/, '') // strip frontmatter
                .replace(/>\s*\[!tldr\][\s\S]*?(?=\n\n|\n#[^#]|$)/gi, '') // strip parsed tldr
                .replace(/>\s*\[!info\][\s\S]*?(?=\n\n|\n#[^#]|$)/gi, '') // strip parsed info
                .trim() || 'No additional content recorded for this entry.'}
            </div>
          </div>
        )}
      </div>

      {/* Footer Meta */}
      <div className="px-8 py-3.5 bg-[#fbfbfb] border-t border-[#eeeeee] flex items-center justify-between text-[11px] font-mono text-[#888888]">
        <span>ID: {note.id}</span>
        <span>Folder: {note.folderType}</span>
      </div>
    </motion.section>
  );
};
