import React, { useState } from 'react';
import type { PortfolioItem } from '../utils/portfolio';
import { Play, LayoutGrid } from 'lucide-react';

interface PortfolioWaterfallGalleryProps {
  items: PortfolioItem[];
  onNavigateWikilink: (target: string) => void;
  onSelectHashtag?: (tag: string) => void;
  isMobile?: boolean;
}

export const PortfolioWaterfallGallery: React.FC<PortfolioWaterfallGalleryProps> = ({
  items,
  onNavigateWikilink,
  onSelectHashtag,
  isMobile = false,
}) => {
  // Track active playing YouTube video ID
  const [playingVideoId, setPlayingVideoId] = useState<number | null>(null);

  if (!items || items.length === 0) return null;

  // Handle card click:
  // 1. If card has linkUrl, navigate to linkUrl in new tab
  // 2. If no linkUrl but has wikilinkTarget, navigate to wikilinkTarget
  const handleMediaClick = (item: PortfolioItem) => {
    if (item.mediaType === 'youtube' && !playingVideoId) {
      setPlayingVideoId(item.id);
      return;
    }
    if (item.linkUrl) {
      window.open(item.linkUrl, '_blank', 'noopener,noreferrer');
    } else if (item.wikilinkTarget) {
      onNavigateWikilink(item.wikilinkTarget);
    }
  };

  return (
    <div className="w-full my-6 sm:my-8 flex flex-col">
      {/* Portfolio Section Header */}
      <div className="flex items-center justify-between pb-2.5 sm:pb-3 mb-4 sm:mb-5 border-b border-[#eeeeee]">
        <div className="flex items-center gap-2">
          <h2 className="text-lg sm:text-2xl font-black tracking-tight text-black font-sans">
            Portfolio
          </h2>
          <span className="font-mono text-[10px] sm:text-[11px] font-semibold text-[#666666] bg-[#f4f4f5] px-2 py-0.5 rounded-full border border-black/5">
            {items.length} works
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[#888888] font-mono text-[10px] sm:text-[11px]">
          <LayoutGrid className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span className="hidden sm:inline">3-Column Waterfall</span>
          <span className="inline sm:hidden">2-Column Waterfall</span>
        </div>
      </div>

      {/* Responsive Waterfall: 2-Column on Mobile, 3-Column on Desktop (lg:) */}
      <div className="columns-2 lg:columns-3 gap-3 sm:gap-5 [column-fill:_balance]">
        {items.map((item) => {
          const isPlaying = playingVideoId === item.id;
          const isClickable = Boolean(item.linkUrl || item.wikilinkTarget || (item.mediaType === 'youtube' && !isPlaying));

          return (
            <div
              key={item.id}
              className="break-inside-avoid mb-4 sm:mb-5 group relative rounded-xl sm:rounded-2xl overflow-hidden bg-transparent shadow-xs transition-all duration-300 flex flex-col"
            >
              {/* Media Container */}
              <div
                onClick={() => handleMediaClick(item)}
                className={`relative w-full overflow-hidden rounded-xl sm:rounded-2xl bg-[#f0f0f2] ${
                  isClickable ? 'cursor-pointer' : ''
                }`}
              >
                {/* 1. Image */}
                {item.mediaType === 'image' && (
                  <img
                    src={item.mediaUrl}
                    alt={item.title}
                    loading="lazy"
                    className="w-full h-auto object-cover rounded-xl sm:rounded-2xl block group-hover:scale-[1.02] transition-transform duration-500 ease-out"
                  />
                )}

                {/* 2. HTML5 Video */}
                {item.mediaType === 'video' && (
                  <video
                    src={item.mediaUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-auto object-cover rounded-xl sm:rounded-2xl block group-hover:scale-[1.02] transition-transform duration-500 ease-out"
                  />
                )}

                {/* 3. YouTube Embed or Fast Preview Thumbnail */}
                {item.mediaType === 'youtube' && item.youtubeId && (
                  <div className="relative w-full aspect-video bg-black rounded-xl sm:rounded-2xl flex items-center justify-center overflow-hidden">
                    {isPlaying ? (
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${item.youtubeId}?autoplay=1&rel=0`}
                        title={item.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full border-0 rounded-xl sm:rounded-2xl"
                      />
                    ) : (
                      <>
                        <img
                          src={`https://img.youtube.com/vi/${item.youtubeId}/maxresdefault.jpg`}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${item.youtubeId}/hqdefault.jpg`;
                          }}
                          alt={item.title}
                          loading="lazy"
                          className="w-full h-full object-cover rounded-xl sm:rounded-2xl group-hover:scale-[1.03] transition-transform duration-500"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPlayingVideoId(item.id);
                          }}
                          aria-label={`Play ${item.title}`}
                          className="absolute inset-0 m-auto w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/65 backdrop-blur-md text-white flex items-center justify-center group-hover:scale-110 group-hover:bg-red-600 transition-all shadow-lg border border-white/20 cursor-pointer"
                        >
                          <Play className="w-4 h-4 sm:w-5 sm:h-5 ml-0.5 fill-white" />
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* 4. Instagram Post Embed */}
                {item.mediaType === 'instagram' && (
                  <div
                    className="relative w-full overflow-hidden rounded-xl sm:rounded-2xl bg-white"
                    style={{
                      aspectRatio: item.aspectRatio || '1 / 1.25',
                      maxHeight: isMobile ? '360px' : '580px',
                    }}
                  >
                    <iframe
                      src={item.mediaUrl}
                      title={item.title}
                      scrolling="no"
                      className="absolute inset-0 w-full h-[140%] -top-[52px] border-0"
                    />
                  </div>
                )}

                {/* Desktop Only: Floating Info Overlay Bar on Hover (Hidden on mobile) */}
                <div className="hidden sm:block absolute bottom-3 left-3 right-3 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0 z-10">
                  <div className="bg-black/80 backdrop-blur-md text-white rounded-xl p-3 border border-white/20 shadow-2xl pointer-events-auto">
                    {/* Top Row: Title (Left) and Trailing Text/Wikilinks (Right) */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {item.wikilinkTarget ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigateWikilink(item.wikilinkTarget!);
                            }}
                            title={`Navigate to ${item.wikilinkTarget}`}
                            className="font-sans font-bold text-xs sm:text-sm text-white hover:underline text-left truncate block tracking-tight cursor-pointer"
                          >
                            {item.title}
                          </button>
                        ) : (
                          <span className="font-sans font-bold text-xs sm:text-sm text-white truncate block tracking-tight">
                            {item.title}
                          </span>
                        )}
                      </div>

                      {item.trailingSegments && item.trailingSegments.length > 0 && (
                        <div className="shrink-0 max-w-[50%] flex items-center gap-1 font-mono text-[11px] text-white/80 truncate text-right">
                          {item.trailingSegments.map((seg, sIdx) => {
                            if (seg.wikilink) {
                              return (
                                <button
                                  key={sIdx}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onNavigateWikilink(seg.wikilink!);
                                  }}
                                  title={`Navigate to ${seg.wikilink}`}
                                  className="font-medium text-white hover:underline hover:text-white underline-offset-2 decoration-white/40 cursor-pointer truncate"
                                >
                                  {seg.text}
                                </button>
                              );
                            }
                            return (
                              <span key={sIdx} className="text-white/70 truncate">
                                {seg.text}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Bottom Row: Tags 1-line */}
                    {item.tags.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-white/10 flex items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex-nowrap gap-1.5">
                        {item.tags.map((tag, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectHashtag?.(tag);
                            }}
                            className="font-mono text-[9px] text-white/90 bg-white/15 hover:bg-white hover:text-black px-2 py-0.5 rounded transition-colors cursor-pointer select-none shrink-0 whitespace-nowrap leading-none border border-white/10"
                          >
                            #{tag.replace(/^#/, '')}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Mobile Only: Option A - Slim Minimal Inline Caption Below Media (Does not occlude image!) */}
              <div className="sm:hidden flex flex-col pt-2 pb-1 px-0.5">
                {/* Title & Trailing Text Row */}
                <div className="flex items-start justify-between gap-1 leading-snug">
                  <div className="min-w-0 flex-1">
                    {item.wikilinkTarget ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateWikilink(item.wikilinkTarget!);
                        }}
                        className="font-sans font-bold text-[12px] text-black hover:underline text-left line-clamp-1 tracking-tight cursor-pointer"
                      >
                        {item.title}
                      </button>
                    ) : (
                      <span className="font-sans font-bold text-[12px] text-black line-clamp-1 tracking-tight">
                        {item.title}
                      </span>
                    )}
                  </div>

                  {/* Subtitle / Trailing segments */}
                  {item.trailingSegments && item.trailingSegments.length > 0 && (
                    <div className="shrink-0 max-w-[45%] flex items-center gap-0.5 font-mono text-[10px] text-[#777777] truncate text-right">
                      {item.trailingSegments.map((seg, sIdx) => {
                        if (seg.wikilink) {
                          return (
                            <button
                              key={sIdx}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onNavigateWikilink(seg.wikilink!);
                              }}
                              className="font-medium text-[#444444] underline underline-offset-2 decoration-[#999999] cursor-pointer truncate"
                            >
                              {seg.text}
                            </button>
                          );
                        }
                        return (
                          <span key={sIdx} className="text-[#888888] truncate">
                            {seg.text}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Tags strictly in 1-line horizontal scroll */}
                {item.tags.length > 0 && (
                  <div className="mt-1.5 flex items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex-nowrap gap-1">
                    {item.tags.map((tag, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectHashtag?.(tag);
                        }}
                        className="font-mono text-[9px] text-[#444444] bg-[#f2f2f4] hover:bg-black hover:text-white px-1.5 py-0.5 rounded transition-colors cursor-pointer select-none shrink-0 whitespace-nowrap leading-none border border-black/5"
                      >
                        #{tag.replace(/^#/, '')}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
