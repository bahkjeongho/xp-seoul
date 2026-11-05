import { marked } from 'marked';

// Configure marked with GFM and line breaks
marked.setOptions({
  gfm: true,
  breaks: true,
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

function processWikilinksAndImages(markdownText: string): string {
  // 1. Transform Obsidian Image Embeds ![[image.png]]
  let text = markdownText.replace(/!\[\[([^\]]+)\]\]/g, (match, src) => {
    return `![${src}](/images/${encodeURIComponent(src)})`;
  });

  // 2. Transform Obsidian Wikilinks [[Target|Display]] or [[Target]]
  text = text.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, target, display) => {
    const cleanTarget = target.trim();
    const cleanDisplay = (display || target).trim();
    return `<a href="#wikilink" data-wikilink="${cleanTarget}" class="wikilink font-medium text-black underline underline-offset-4 decoration-black/30 hover:decoration-black hover:bg-black/5 px-1 py-0.5 rounded transition-colors inline-block cursor-pointer">${cleanDisplay}</a>`;
  });

  return text;
}

export function renderObsidianBlock(block: ContentBlock): string {
  if (block.type === 'callout') {
    const processedLines = processWikilinksAndImages(block.lines.join('\n'));
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
  const processedText = processWikilinksAndImages(block.content);
  return marked.parse(processedText) as string;
}

export function renderFullNoteHtml(rawContent: string): string {
  if (!rawContent) return '';

  // Strip frontmatter
  const bodyText = rawContent.replace(/^---[\s\S]*?---\n*/, '');
  const blocks = parseObsidianBlocks(bodyText);

  return blocks.map(renderObsidianBlock).join('\n');
}
