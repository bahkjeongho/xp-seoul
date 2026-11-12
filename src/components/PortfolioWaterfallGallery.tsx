import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { PortfolioItem } from '../utils/portfolio';
import { Play, LayoutGrid } from 'lucide-react';

interface PortfolioWaterfallGalleryProps {
  items: PortfolioItem[];
  onNavigateWikilink: (target: string) => void;
  onSelectHashtag?: (tag: string) => void;
  isMobile?: boolean;
}

/**
 * LazyVideo: Only loads and plays HTML5 videos when near or in the viewport,
 * preventing network bandwidth saturation when multiple video embeds are present.
 */
const LazyVideo: React.FC<{
  src: string;
  className?: string;
}> = ({ src, className }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            el.play().catch(() => {});
          } else {
            el.pause();
          }
        });
      },
      { rootMargin: '250px 0px', threshold: 0.05 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={videoRef}
      src={isInView ? src : undefined}
      data-src={src}
      preload="metadata"
      autoPlay
      loop
      muted
      playsInline
      className={className}
    />
  );
};

export const PortfolioWaterfallGallery: React.FC<PortfolioWaterfallGalleryProps> = ({
  items,
  onNavigateWikilink,
  onSelectHashtag,
  isMobile = false,
}) => {
  // Track active playing YouTube video ID
  const [playingVideoId, setPlayingVideoId] = useState<number | null>(null);

  // Distribute items into columns so top items of each column start strictly at top: 0
  const mobileCols = useMemo(() => {
    const col1 = items.filter((_, idx) => idx % 2 === 0);
    const col2 = items.filter((_, idx) => idx % 2 === 1);
    return [col1, col2];
  }, [items]);

  const desktopCols = useMemo(() => {
    const col1 = items.filter((_, idx) => idx % 3 === 0);
    const col2 = items.filter((_, idx) => idx % 3 === 1);
    const col3 = items.filter((_, idx) => idx % 3 === 2);
    return [col1, col2, col3];
  }, [items]);

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

  const renderCard = (item: PortfolioItem) => {
    const isPlaying = playingVideoId === item.id;
    const isClickable = Boolean(item.linkUrl || item.wikilinkTarget || (item.mediaType === 'youtube' && !isPlaying));

    return (
      <div
        key={item.id}
        className="w-full group relative rounded-xl sm:rounded-2xl overflow-hidden bg-white shadow-xs border border-black/5 hover:border-black/15 transition-all duration-300 flex flex-col"
      >
        {/* Media Container */}
        <div
          onClick={() => handleMediaClick(item)}
          className={`relative w-full overflow-hidden rounded-t-xl sm:rounded-2xl bg-[#f0f0f2] ${
            isClickable ? 'cursor-pointer' : ''
          }`}
        >
          {/* 1. Image */}
          {item.mediaType === 'image' && (
            <img
              src={item.mediaUrl}
              alt={item.title}
              loading="lazy"
              className="w-full h-auto object-cover block group-hover:scale-[1.02] transition-transform duration-500 ease-out"
            />
          )}

          {/* 2. HTML5 Video (Lazy loaded with IntersectionObserver) */}
          {item.mediaType === 'video' && (
            <LazyVideo
              src={item.mediaUrl}
              className="w-full h-auto object-cover block group-hover:scale-[1.02] transition-transform duration-500 ease-out"
            />
          )}

          {/* 3. YouTube Embed or Fast Preview Thumbnail */}
          {item.mediaType === 'youtube' && item.youtubeId && (
            <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
              {isPlaying ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${item.youtubeId}?autoplay=1&rel=0`}
                  title={item.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
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
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
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
              className="relative w-full overflow-hidden bg-white"
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

          {/* Desktop Only: Floating Info Overlay Bar on Hover */}
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

        {/* Mobile Only: 3 Separate Lines (Line 1: Title | Line 2: by OOO | Line 3: Tags) with proper padding */}
        <div className="sm:hidden flex flex-col gap-1.5 pt-2.5 pb-2.5 px-3">
          {/* Line 1: Title */}
          <div className="min-w-0">
            {item.wikilinkTarget ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigateWikilink(item.wikilinkTarget!);
                }}
                className="font-sans font-bold text-[12.5px] text-black hover:underline text-left line-clamp-1 tracking-tight cursor-pointer block"
              >
                {item.title}
              </button>
            ) : (
              <span className="font-sans font-bold text-[12.5px] text-black line-clamp-1 tracking-tight block">
                {item.title}
              </span>
            )}
          </div>

          {/* Line 2: by OOO / Trailing segments (same font size as title for easy touch) */}
          {item.trailingSegments && item.trailingSegments.length > 0 && (
            <div className="flex items-center gap-1 font-mono text-[12px] text-[#444444] truncate">
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
                      className="font-medium text-black underline underline-offset-2 decoration-[#888888] hover:text-black cursor-pointer truncate"
                    >
                      {seg.text}
                    </button>
                  );
                }
                return (
                  <span key={sIdx} className="text-[#666666] truncate">
                    {seg.text}
                  </span>
                );
              })}
            </div>
          )}

          {/* Line 3: Tags strictly 1-line with active touch feedback */}
          {item.tags.length > 0 && (
            <div className="flex items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex-nowrap gap-1 pt-0.5">
              {item.tags.map((tag, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectHashtag?.(tag);
                  }}
                  className="font-mono text-[10px] text-[#444444] bg-[#f2f2f4] active:bg-black active:text-white px-2 py-0.5 rounded-md transition-colors duration-100 cursor-pointer select-none shrink-0 whitespace-nowrap leading-none border border-black/5"
                >
                  #{tag.replace(/^#/, '')}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
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

      {/* Mobile: 2-Column Waterfall with 100% strict top-alignment (items-start) */}
      <div className="flex sm:hidden gap-3 items-start w-full">
        <div className="flex-1 flex flex-col gap-3.5 min-w-0">
          {mobileCols[0].map(renderCard)}
        </div>
        <div className="flex-1 flex flex-col gap-3.5 min-w-0">
          {mobileCols[1].map(renderCard)}
        </div>
      </div>

      {/* Desktop: 3-Column Waterfall with 100% strict top-alignment (items-start) */}
      <div className="hidden sm:flex gap-5 items-start w-full">
        <div className="flex-1 flex flex-col gap-5 min-w-0">
          {desktopCols[0].map(renderCard)}
        </div>
        <div className="flex-1 flex flex-col gap-5 min-w-0">
          {desktopCols[1].map(renderCard)}
        </div>
        <div className="flex-1 flex flex-col gap-5 min-w-0">
          {desktopCols[2].map(renderCard)}
        </div>
      </div>
    </div>
  );
};
