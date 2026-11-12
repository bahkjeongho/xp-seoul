import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Clock } from 'lucide-react';
import { useLenisScroll } from '../hooks/useLenisScroll';
import initialBlogPosts from '../data/blog-posts.json';

interface BlogPost {
  id: string;
  title: string;
  date: string;
  tags?: string[];
  content?: string;
}

export const BlogView: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>(initialBlogPosts as BlogPost[]);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const detailContainerRef = useRef<HTMLDivElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Fetch blog-posts.json client-side fallback if empty
  useEffect(() => {
    if (posts.length === 0) {
      fetch('/data/blog-posts.json')
        .then((res) => res.json())
        .then((data: BlogPost[]) => setPosts(data))
        .catch((err) => console.error('Failed to load blog posts:', err));
    }
  }, [posts.length]);

  const selectedPost = posts.find((p) => p.id === selectedPostId) || null;

  useLenisScroll(detailContainerRef, [selectedPostId]);
  useLenisScroll(listContainerRef, []);

  // Update browser URL and history stack when selecting/deselecting a post
  const selectPostWithHistory = useCallback((postId: string | null, pushHistory: boolean = true) => {
    setSelectedPostId(postId);
    if (typeof window === 'undefined') return;

    if (postId) {
      if (pushHistory) {
        const newUrl = `${window.location.pathname}?post=${encodeURIComponent(postId)}`;
        window.history.pushState({ blogPostId: postId }, '', newUrl);
      }
    } else {
      if (pushHistory) {
        window.history.pushState({ blogPostId: null }, '', window.location.pathname);
      }
    }
  }, []);

  // Sync with initial URL (?post=...) on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const postParam = urlParams.get('post');
      if (postParam) {
        setSelectedPostId(postParam);
      }
    }
  }, []);

  // Browser Back / Forward button (popstate) listener
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const postId = e.state?.blogPostId || null;
      if (postId) {
        selectPostWithHistory(postId, false);
      } else {
        const urlParams = new URLSearchParams(window.location.search);
        const postParam = urlParams.get('post');
        selectPostWithHistory(postParam, false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectPostWithHistory]);

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      selectPostWithHistory(null, true);
    }
  };

  if (selectedPost) {
    return (
      <div
        ref={detailContainerRef}
        className="flex-1 h-full overflow-y-auto bg-white px-8 lg:px-24 py-16 max-w-4xl mx-auto flex flex-col gap-8"
      >
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-2 font-mono text-xs text-[#888888] hover:text-black transition-colors self-start"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        <header className="flex flex-col gap-3 border-b border-[#eeeeee] pb-6">
          {selectedPost.date && (
            <div className="flex items-center gap-1.5 font-mono text-xs text-[#888888]">
              <Clock className="w-3.5 h-3.5" />
              <span>{selectedPost.date}</span>
            </div>
          )}

          <h1 className="text-2xl lg:text-3xl font-black tracking-[-0.03em] text-black leading-snug font-sans">
            {selectedPost.title}
          </h1>
        </header>

        <article className="prose prose-base text-[#222222] font-sans leading-relaxed whitespace-pre-line">
          {selectedPost.content || (
            <p className="font-mono text-xs text-[#aaaaaa]">작성 중인 글입니다.</p>
          )}
        </article>
      </div>
    );
  }

  return (
    <div
      ref={listContainerRef}
      className="flex-1 h-full overflow-y-auto bg-white px-8 lg:px-20 py-16 flex flex-col gap-10 max-w-4xl mx-auto"
    >
      <header className="flex flex-col gap-2 border-b border-black pb-6">
        <span className="font-mono text-xs uppercase tracking-widest text-[#888888]">
          Thoughts & Essays
        </span>
        <h1 className="text-3xl lg:text-5xl font-black tracking-[-0.04em] text-black">
          Blog
        </h1>
      </header>

      <div className="flex flex-col divide-y divide-[#eeeeee]">
        {posts.map((post) => (
          <article
            key={post.id}
            onClick={() => selectPostWithHistory(post.id, true)}
            className="group py-6 flex flex-col gap-2 cursor-pointer hover:bg-[#fafafa] px-4 -mx-4 rounded-xl transition-colors"
          >
            {post.date && (
              <div className="font-mono text-xs text-[#888888]">
                <span>{post.date}</span>
              </div>
            )}

            <h2 className="text-xl lg:text-2xl font-bold tracking-tight text-black group-hover:underline underline-offset-4 decoration-1">
              {post.title}
            </h2>

            {post.content && (
              <p className="text-sm text-[#555555] font-sans leading-relaxed line-clamp-2">
                {post.content}
              </p>
            )}
          </article>
        ))}

        {posts.length === 0 && (
          <div className="py-12 text-center text-[#aaaaaa] font-mono text-xs">
            등록된 포스트가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};
