import React, { useState } from 'react';
import type { PortfolioItem } from '../utils/portfolio';
import { Play, LayoutGrid } from 'lucide-react';

interface PortfolioWaterfallGalleryProps {
  items: PortfolioItem[];
  onNavigateWikilink: (target: string) => void;
  onSelectHashtag?: (tag: string) => void;
}

export const PortfolioWaterfallGallery: React.FC<PortfolioWaterfallGalleryProps> = ({
  items,
  onNavigateWikilink,
  onSelectHashtag,
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
    <div className="w-full my-8 flex flex-col">
      {/* Portfolio Section Header */}
      <div className="flex items-center justify-between pb-3 mb-5 border-b border-[#eeeeee]">
        <div className="flex items-center gap-2">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-black font-sans">
            Portfolio
          </h2>
          <span className="font-mono text-[11px] font-semibold text-[#666666] bg-[#f4f4f5] px-2 py-0.5 rounded-full border border-black/5">
            {items.length} works
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[#888888] font-mono text-[11px]">
          <LayoutGrid className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">3-Column Waterfall</span>
        </div>
      </div>

      {/* 3-Column Desktop Waterfall (Masonry Grid) */}
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 [column-fill:_balance]">
        {items.map((item) => {
          const isPlaying = playingVideoId === item.id;
          const isClickable = Boolean(item.linkUrl || item.wikilinkTarget || (item.mediaType === 'youtube' && !isPlaying));

          return (
            <div
              key={item.id}
              className="break-inside-avoid mb-5 group relative rounded-2xl overflow-hidden bg-transparent shadow-xs hover:shadow-lg transition-all duration-300"
            >
              {/* Media Container */}
              <div
                onClick={() => handleMediaClick(item)}
                className={`relative w-full overflow-hidden rounded-2xl ${
                  isClickable ? 'cursor-pointer' : ''
                }`}
              >
                {/* 1. Image */}
                {item.mediaType === 'image' && (
                  <img
                    src={item.mediaUrl}
                    alt={item.title}
                    loading="lazy"
                    className="w-full h-auto object-cover rounded-2xl block group-hover:scale-[1.02] transition-transform duration-500 ease-out"
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
                    className="w-full h-auto object-cover rounded-2xl block group-hover:scale-[1.02] transition-transform duration-500 ease-out"
                  />
                )}

                {/* 3. YouTube Embed or Fast Preview Thumbnail */}
                {item.mediaType === 'youtube' && item.youtubeId && (
                  <div className="relative w-full aspect-video bg-black rounded-2xl flex items-center justify-center overflow-hidden">
                    {isPlaying ? (
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${item.youtubeId}?autoplay=1&rel=0`}
                        title={item.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full border-0 rounded-2xl"
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
                          className="w-full h-full object-cover rounded-2xl group-hover:scale-[1.03] transition-transform duration-500"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPlayingVideoId(item.id);
                          }}
                          aria-label={`Play ${item.title}`}
                          className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-black/65 backdrop-blur-md text-white flex items-center justify-center group-hover:scale-110 group-hover:bg-red-600 transition-all shadow-lg border border-white/20 cursor-pointer"
                        >
                          <Play className="w-5 h-5 ml-0.5 fill-white" />
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* 4. Instagram Post Embed */}
                {item.mediaType === 'instagram' && (
                  <div
                    className="relative w-full overflow-hidden rounded-2xl bg-white"
                    style={{
                      aspectRatio: item.aspectRatio || '1 / 1.25',
                      maxHeight: '580px',
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
              </div>

              {/* Floating Info Overlay Bar: Hidden by default, appears on mouse hover */}
              <div className="absolute bottom-3 left-3 right-3 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0 z-10">
                <div className="bg-black/80 backdrop-blur-md text-white rounded-xl p-3 border border-white/20 shadow-2xl pointer-events-auto">
                  {/* Top Row: Title (Left) and Trailing Text/Wikilinks (Right - in place of old View button) */}
                  <div className="flex items-center justify-between gap-2">
                    {/* Left: Primary Title */}
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

                    {/* Right: Trailing Text or Secondary Wikilink (e.g. "Art Museum" or "by TUIDE") */}
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

                  {/* Bottom Row: Tags strictly in single line with horizontal scroll & ellipsis */}
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
          );
        })}
      </div>
    </div>
  );
};
