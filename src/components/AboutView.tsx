import React from 'react';
import { Sparkles, Terminal, BookMarked, Layers } from 'lucide-react';

export const AboutView: React.FC = () => {
  return (
    <div className="flex-1 h-full overflow-y-auto bg-white px-8 lg:px-20 py-16 flex flex-col gap-12 max-w-4xl mx-auto">
      <header className="flex flex-col gap-3 border-b border-black pb-8">
        <span className="font-mono text-xs uppercase tracking-widest text-[#888888]">About Platform</span>
        <h1 className="text-4xl lg:text-6xl font-black tracking-[-0.05em] text-black">
          XP Seoul
        </h1>
        <p className="font-sans text-base text-[#555555] leading-relaxed max-w-2xl">
          서울의 시각 문화, 아티스트, 디자인 스튜디오, 독립 출판, 음악과 브랜드를 집대성하는 디지털 아카이브이자 인터랙티브 위키 플랫폼입니다.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
        <div className="flex flex-col gap-3 p-6 bg-[#f8f8fa] rounded-2xl border border-[#eeeeee]">
          <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center mb-1">
            <BookMarked className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-lg text-black font-sans">Curated Knowledge Base</h3>
          <p className="text-[#666666] leading-relaxed">
            옵시디언(Obsidian) 볼트의 4,200개 이상의 정제된 노트를 기반으로, K-Pop, 그래픽 디자인, 패션, 건축에 이르는 다층적 문화 지형도를 구축합니다.
          </p>
        </div>

        <div className="flex flex-col gap-3 p-6 bg-[#f8f8fa] rounded-2xl border border-[#eeeeee]">
          <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center mb-1">
            <Layers className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-lg text-black font-sans">Interactive Stream Engine</h3>
          <p className="text-[#666666] leading-relaxed">
            기존의 단편적인 문서 검색을 탈피하여, 렌즈 휠(Focus Stream)과 다단계 계층 필터(Category → Topic)를 통해 영감을 즉각적으로 건져 올리는 탐색 경험을 제공합니다.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-4 pt-6 border-t border-[#eeeeee] font-mono text-xs text-[#777777]">
        <div className="flex justify-between items-center py-2 border-b border-[#f2f2f2]">
          <span>Project Name</span>
          <span className="text-black font-bold">XP Seoul (Alternative Engine)</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-[#f2f2f2]">
          <span>Tech Stack</span>
          <span className="text-black">Astro v5 · React 19 · Tailwind CSS v4 · Framer Motion</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-[#f2f2f2]">
          <span>Design Architecture</span>
          <span className="text-black">Obys Agency 3-Column + i-D Magazine Editorial Style</span>
        </div>
      </section>
    </div>
  );
};
