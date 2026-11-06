import React, { useRef } from 'react';
import { useLenisScroll } from '../hooks/useLenisScroll';

export const MagazineView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  useLenisScroll(containerRef, []);

  return (
    <div
      ref={containerRef}
      className="flex-1 h-full overflow-y-auto bg-white px-8 lg:px-20 py-16 flex flex-col gap-12 max-w-4xl mx-auto"
    >
      <header className="flex flex-col gap-3 border-b border-black pb-8">
        <span className="font-mono text-xs uppercase tracking-widest text-[#888888]">Curations & Editorial</span>
        <h1 className="text-4xl lg:text-6xl font-black tracking-[-0.05em] text-black">
          Magazine
        </h1>
      </header>

      <section className="flex flex-col gap-6 font-sans text-sm text-[#888888]">
        {/* Placeholder for future Magazine/Curated Lists */}
        <p className="font-mono text-xs text-[#aaaaaa]">Coming soon.</p>
      </section>
    </div>
  );
};
