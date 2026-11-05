import React, { useState, useRef } from 'react';
import { ArrowLeft, Clock, Tag } from 'lucide-react';
import { useLenisScroll } from '../hooks/useLenisScroll';

interface BlogPost {
  title: string;
  date: string;
  tags: string[];
  excerpt: string;
  content: string;
}

const SAMPLE_POSTS: BlogPost[] = [
  {
    title: "NewJeans와 반(反) K-Pop의 미학",
    date: "2026.10.26",
    tags: ["K-Pop", "Cultural Critique", "Design"],
    excerpt: "기존 K-Pop의 맥시멀리즘과 과잉 서사에서 탈피해, Y2K의 투명한 노스탤지어와 버내큘러 그래픽을 수혈한 방식에 대한 비평.",
    content: `NewJeans의 등장은 단순한 신인 아이돌의 히트가 아니라, 지난 10년간 K-Pop 씬을 지배해 온 고밀도 세계관과 맥시멀한 비주얼 연출에 대한 감각적인 반작용이었다.

과도한 CG와 미래지향적 사이버네틱 무드 대신 캠코더 질감의 로우파이(Lo-fi) 영상, 일상적 스냅샷, 날것의 타이포그래피를 전면에 내세웠다. 이는 대중으로 하여금 '완벽하게 기획된 상품'이 아닌 '어딘가에 실재하는 청춘의 단면'을 엿보는 듯한 착시를 불러일으켰다.

이 글에서는 NewJeans가 시도한 비주얼 디렉션과 사운드 스케이프가 어떻게 한국 대중문화의 새로운 기준점을 제시했는지 고찰한다.`
  },
  {
    title: "'체포하겠어'와 'REDRED' MV, 한국의 버내큘러",
    date: "2026.10.27",
    tags: ["Vernacular", "Music Video", "Visual Identity"],
    excerpt: "길거리 간판, 낡은 골목, 공사판의 타이포그래피. 한국 도시 공간의 시각적 파편들이 현대 뮤직비디오에서 재해석되는 양상.",
    content: `한국의 시각 문화에서 '버내큘러(Vernacular)'는 오랫동안 촌스러움이나 정돈되지 않은 무질서의 상징으로 치부되어 왔다. 그러나 최근의 서브컬처 뮤직비디오들은 서울의 골목길 간판, 공공 표지판의 오타, 삐뚤빼뚤한 시트지 글자들을 가장 전위적인 미학적 재료로 차용하기 시작했다.

도시의 생생한 흔적을 아카이빙하고 그것을 팝 아트적 콜라주로 변환하는 시도들은 한국의 그래픽 디자인 씬에 새로운 질문을 던지고 있다.`
  },
  {
    title: "NEON과 네온사인 : 빛의 활자학",
    date: "2026.10.25",
    tags: ["Typography", "Urban", "Light"],
    excerpt: "가스 튜브를 굽혀 만든 활자가 서울의 밤을 물들이던 시절부터, LED와 디지털 사이니지로 대체된 오늘날의 풍경까지.",
    content: `네온사인은 단순한 조명이 아니라 밤의 공간을 점유하는 3차원 활자였다. 손으로 직접 유리관을 구부려 만든 글자들은 디지털 폰트가 흉내 낼 수 없는 물리적 굴절과 온도를 머금고 있었다.

도시의 재개발과 규제로 사라져가는 전통적인 네온 활자들을 기록하고, 그것이 디지털 스크린 시대에 어떻게 오마주되는지 추적한다.`
  },
  {
    title: "JFF Essential List : 문화적 지층을 이루는 것들",
    date: "2026.10.24",
    tags: ["Archive", "Essential List"],
    excerpt: "취향의 형성과 작업의 기반이 되어준 핵심적인 음악, 건축, 독립 출판물 아카이브 셀렉션.",
    content: `아카이브의 본질은 축적이 아니라 선별과 편집에 있다. 끝없이 범람하는 정보 속에서 우리를 규정하는 것은 '무엇을 담았는가'보다 '무엇을 남겨두었는가'이다.`
  }
];

export const BlogView: React.FC = () => {
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const detailContainerRef = useRef<HTMLDivElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  useLenisScroll(detailContainerRef, [selectedPost?.title]);
  useLenisScroll(listContainerRef, []);

  if (selectedPost) {
    return (
      <div
        ref={detailContainerRef}
        className="flex-1 h-full overflow-y-auto bg-white px-8 lg:px-24 py-16 max-w-4xl mx-auto flex flex-col gap-10"
      >
        <button
          onClick={() => setSelectedPost(null)}
          className="inline-flex items-center gap-2 font-mono text-xs text-[#888888] hover:text-black transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Essays</span>
        </button>

        <header className="flex flex-col gap-4 border-b border-[#eeeeee] pb-8">
          <div className="flex items-center gap-3 font-mono text-xs text-[#888888]">
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{selectedPost.date}</span>
            <span>·</span>
            <div className="flex gap-2">
              {selectedPost.tags.map(t => (
                <span key={t} className="px-2 py-0.5 rounded bg-[#f2f2f2] text-black">#{t}</span>
              ))}
            </div>
          </div>

          <h1 className="text-3xl lg:text-5xl font-black tracking-[-0.04em] text-black leading-tight font-sans">
            {selectedPost.title}
          </h1>
        </header>

        <article className="prose prose-lg text-[#222222] font-sans leading-relaxed whitespace-pre-line text-base lg:text-lg">
          {selectedPost.content}
        </article>
      </div>
    );
  }

  return (
    <div
      ref={listContainerRef}
      className="flex-1 h-full overflow-y-auto bg-white px-8 lg:px-20 py-16 flex flex-col gap-12 max-w-5xl mx-auto"
    >
      <header className="flex flex-col gap-2 border-b border-black pb-6">
        <span className="font-mono text-xs uppercase tracking-widest text-[#888888]">Journal & Critique</span>
        <h1 className="text-4xl lg:text-6xl font-black tracking-[-0.05em] text-black">
          Thoughts / Essays
        </h1>
        <p className="font-sans text-sm text-[#666666] max-w-xl mt-1">
          시각 문화, 도시의 버내큘러, 음악과 그래픽 디자인의 접점을 탐구하는 에세이 기록.
        </p>
      </header>

      <div className="flex flex-col divide-y divide-[#eeeeee]">
        {SAMPLE_POSTS.map((post) => (
          <article
            key={post.title}
            onClick={() => setSelectedPost(post)}
            className="group py-8 flex flex-col gap-3 cursor-pointer hover:bg-[#fafafa] px-4 -mx-4 rounded-xl transition-colors"
          >
            <div className="flex items-center justify-between font-mono text-xs text-[#888888]">
              <span>{post.date}</span>
              <div className="flex gap-2">
                {post.tags.map(t => (
                  <span key={t} className="group-hover:text-black">#{t}</span>
                ))}
              </div>
            </div>

            <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-black group-hover:underline underline-offset-4 decoration-1">
              {post.title}
            </h2>

            <p className="text-sm text-[#555555] font-sans leading-relaxed line-clamp-2">
              {post.excerpt}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
};
