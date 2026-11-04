import { marked } from 'marked';

// Configure marked with GFM
marked.setOptions({
  gfm: true,
  breaks: true,
});

export function renderObsidianMarkdown(rawText: string): string {
  if (!rawText) return '';

  // 1. Remove YAML frontmatter if present
  let cleanText = rawText.replace(/^---[\s\S]*?---\n*/, '');

  // 2. Transform Obsidian Callouts: > [!type] Title \n > Body...
  // into styled HTML blocks
  cleanText = cleanText.replace(
    /(?:^|\n)(> *\[!([a-zA-Z0-9_-]+)\][^\n]*\n(?:> *[^\n]*\n?)*)/g,
    (match, fullBlock, calloutType) => {
      const type = calloutType.toLowerCase();
      const lines = fullBlock.split('\n').map((l: string) => l.replace(/^> */, '').trim());
      const headerLine = lines[0].replace(/^\[![^\]]+\]\s*/, '').trim();
      const bodyLines = lines.slice(1).join('\n').trim();

      const badgeTitle = headerLine || (type === 'tldr' ? 'TL;DR Overview' : type.toUpperCase());
      
      return `\n\n<div class="callout callout-${type} my-6 p-6 rounded-xl border border-black/10 bg-[#f9f9fb]">
        <div class="callout-header font-mono text-[11px] font-bold uppercase tracking-wider text-black mb-2 flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-black"></span>
          <span>${badgeTitle}</span>
        </div>
        <div class="callout-body font-sans text-sm leading-relaxed text-[#222222]">
          ${bodyLines ? marked.parse(bodyLines) : ''}
        </div>
      </div>\n\n`;
    }
  );

  // 3. Transform Obsidian Wikilinks [[Target|Display]] or [[Target]]
  cleanText = cleanText.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, target, display) => {
    const text = display || target;
    return `<span class="wikilink font-medium underline underline-offset-2 decoration-black/30 hover:decoration-black cursor-pointer">${text}</span>`;
  });

  // 4. Transform Obsidian Image Embeds ![[image.png]]
  cleanText = cleanText.replace(/!\[\[([^\]]+)\]\]/g, (match, src) => {
    return `<img src="/images/${encodeURIComponent(src)}" alt="${src}" class="rounded-lg my-4 max-w-full h-auto" />`;
  });

  // 5. Parse remaining standard markdown (includes raw <iframe>, <video>, <table>, etc.)
  return marked.parse(cleanText) as string;
}
