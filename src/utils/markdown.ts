import { marked } from 'marked';

// Configure marked with GFM, line breaks, and enhanced external link renderer
const renderer = new marked.Renderer();
renderer.link = function ({ href, title, tokens }) {
  const text = this.parser.parseInline(tokens);
  const isExternal = /^https?:\/\//i.test(href || '');
  const titleAttr = title ? ` title="${title}"` : '';
  
  if (isExternal) {
    return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="external-link inline-flex items-center gap-1 font-mono text-[13px] text-[#0066cc] hover:text-black border-b border-dashed border-[#0066cc]/50 hover:border-black transition-all px-1 py-0.5 rounded hover:bg-[#0066cc]/5"${titleAttr}><span>${text}</span><svg class="w-3 h-3 inline-block shrink-0 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>`;
  }
  return `<a href="${href}" class="standard-link"${titleAttr}>${text}</a>`;
};

marked.use({
  gfm: true,
  breaks: true,
  renderer,
});

export interface CalloutBlock {
  type: 'callout';
  calloutType: string;
  title: string;
  lines: string[];
}

export interface MarkdownBlock {
  type: 'markdown';
  content: string;
}

export type ContentBlock = CalloutBlock | MarkdownBlock;

export function parseObsidianBlocks(bodyText: string): ContentBlock[] {
  if (!bodyText) return [];

  const lines = bodyText.split(/\r?\n/);
  const blocks: ContentBlock[] = [];
  let currentCallout: CalloutBlock | null = null;
  let normalLines: string[] = [];

  function flushNormal() {
    if (normalLines.length > 0) {
      const content = normalLines.join('\n').trim();
      if (content) {
        blocks.push({ type: 'markdown', content });
      }
      normalLines = [];
    }
  }

  function flushCallout() {
    if (currentCallout) {
      const hasContent = currentCallout.lines.some((l) => l.trim() !== '');
      const hasCustomTitle =
        currentCallout.title &&
        currentCallout.title.toLowerCase() !== currentCallout.calloutType;

      // Only add callouts that actually have content or a custom title
      if (hasContent || hasCustomTitle) {
        blocks.push(currentCallout);
      }
      currentCallout = null;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const calloutMatch = line.match(/^>\s*\[!([a-zA-Z0-9_-]+)\]\s*(.*)$/);

    if (calloutMatch) {
      flushNormal();
      flushCallout();
      currentCallout = {
        type: 'callout',
        calloutType: calloutMatch[1].toLowerCase(),
        title: calloutMatch[2].trim(),
        lines: [],
      };
    } else if (currentCallout) {
      if (line.startsWith('>')) {
        currentCallout.lines.push(line.replace(/^>\s?/, ''));
      } else if (
        line.trim() === '' &&
        i + 1 < lines.length &&
        lines[i + 1].startsWith('>')
      ) {
        currentCallout.lines.push('');
      } else {
        // Callout ended!
        flushCallout();
        normalLines.push(line);
      }
    } else {
      normalLines.push(line);
    }
  }

  flushNormal();
  flushCallout();

  return blocks;
}

function convertVideoEmbeds(text: string): string {
  // YouTube video embeds: ![](https://youtu.be/ID...) or ![](https://www.youtube.com/watch?v=ID...)
  let res = text.replace(
    /!\[.*?\]\(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)[^\)]*\)/g,
    (match, id) => {
      return `\n\n<div class="youtube-embed my-5 aspect-video w-full max-w-[840px] rounded-2xl overflow-hidden shadow-sm border border-black/10 bg-black"><iframe src="https://www.youtube-nocookie.com/embed/${id}" class="w-full h-full" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>\n\n`;
    }
  );

  // Vimeo video embeds: ![](https://vimeo.com/ID...)
  res = res.replace(
    /!\[.*?\]\(https?:\/\/(?:www\.)?vimeo\.com\/(\d+)[^\)]*\)/g,
    (match, id) => {
      return `\n\n<div class="vimeo-embed my-5 aspect-video w-full max-w-[840px] rounded-2xl overflow-hidden shadow-sm border border-black/10 bg-black"><iframe src="https://player.vimeo.com/video/${id}" class="w-full h-full" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>\n\n`;
    }
  );

  return res;
}

function processWikilinksAndImages(markdownText: string, knownTitles?: Set<string>): string {
  // 1. Convert video embeds first
  let text = convertVideoEmbeds(markdownText);

  // 2. Transform Obsidian Image Embeds ![[image.png]]
  text = text.replace(/!\[\[([^\]]+)\]\]/g, (match, src) => {
    return `![${src}](/images/${encodeURIComponent(src)})`;
  });

  // 3. Transform Obsidian Wikilinks [[Target|Display]] or [[Target]]
  text = text.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, target, display) => {
    const cleanTarget = target.trim();
    const cleanDisplay = (display || target).trim();

    const isResolved = knownTitles ? knownTitles.has(cleanTarget.toLowerCase()) : true;

    if (isResolved) {
      return `<a href="#wikilink" data-wikilink="${cleanTarget}" class="wikilink font-medium text-black underline underline-offset-4 decoration-black/30 hover:decoration-black hover:bg-black/5 px-1 py-0.5 rounded transition-colors inline-block cursor-pointer">${cleanDisplay}</a>`;
    } else {
      // Unresolved note in vault
      return `<span data-unresolved-wikilink="${cleanTarget}" title="아직 작성되지 않은 노트입니다" class="wikilink-unresolved font-normal text-[#888888] underline underline-offset-4 decoration-dashed decoration-[#aaaaaa] hover:text-[#444444] px-1 py-0.5 rounded transition-colors inline-block cursor-pointer">${cleanDisplay}</span>`;
    }
  });

  return text;
}

export function renderObsidianBlock(block: ContentBlock, knownTitles?: Set<string>): string {
  if (block.type === 'callout') {
    const processedLines = processWikilinksAndImages(block.lines.join('\n'), knownTitles);
    const bodyHtml = marked.parse(processedLines) as string;

    const displayTitle =
      block.title ||
      (block.calloutType === 'tldr'
        ? 'TL;DR'
        : block.calloutType.toUpperCase());

    return `
      <div class="callout callout-${block.calloutType} my-5 p-5 rounded-xl border border-black/10 bg-[#f8f8fa]">
        <div class="font-mono text-[10px] font-bold uppercase tracking-wider text-[#666666] mb-2 flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-black"></span>
          <span>${displayTitle}</span>
        </div>
        <div class="font-sans text-sm leading-relaxed text-[#111111] space-y-2">
          ${bodyHtml}
        </div>
      </div>
    `;
  }

  // Normal markdown block
  const processedText = processWikilinksAndImages(block.content, knownTitles);
  return marked.parse(processedText) as string;
}

export function renderFullNoteHtml(rawContent: string, knownTitles?: Set<string>): string {
  if (!rawContent) return '';

  // Strip frontmatter
  const bodyText = rawContent.replace(/^---[\s\S]*?---\n*/, '');
  const blocks = parseObsidianBlocks(bodyText);

  return blocks.map((b) => renderObsidianBlock(b, knownTitles)).join('\n');
}
