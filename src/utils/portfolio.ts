export interface TextSegment {
  text: string;
  wikilink?: string;
}

export interface PortfolioItem {
  id: number;
  mediaType: 'image' | 'video' | 'youtube' | 'vimeo' | 'instagram';
  mediaUrl: string;
  aspectRatio?: string;
  youtubeId?: string;
  vimeoId?: string;
  title: string;
  wikilinkTarget?: string;
  trailingSegments: TextSegment[];
  linkUrl?: string;
  tags: string[];
}

export interface ParsedPortfolioNote {
  beforeMarkdown: string;
  items: PortfolioItem[];
  afterMarkdown: string;
}

/**
 * Parses a markdown note to extract the `# Portfolio` section if present.
 * Returns before/after markdown chunks along with structured PortfolioItem array.
 */
export function extractPortfolioSection(rawContent: string): ParsedPortfolioNote | null {
  if (!rawContent) return null;

  // Match # Portfolio or ## Portfolio
  const portfolioMatch = rawContent.match(/(?:^|\n)(#+\s*Portfolio\s*)\n([\s\S]*?)(?=(?:(?:\r?\n)#+\s+[^\n]+|(?:\r?\n)---|(?:\r?\n)\*\s*\*(?:\[\[|[a-zA-Z])|\s*$))/i);
  if (!portfolioMatch) return null;

  const sectionText = portfolioMatch[2].trim();
  const matchStartIndex = portfolioMatch.index ?? 0;
  const actualStart = rawContent.charAt(matchStartIndex) === '\n' ? matchStartIndex + 1 : matchStartIndex;
  const matchEndIndex = actualStart + portfolioMatch[0].length;

  const beforeMarkdown = rawContent.slice(0, actualStart).trim();
  const afterMarkdown = rawContent.slice(matchEndIndex).trim();

  // Split section into individual media blocks
  const parts = sectionText.split(/(?:\r?\n){1,}(?=(?:<div\s+style=|<video|!\[|<iframe))/i);
  const items: PortfolioItem[] = [];

  for (let block of parts) {
    block = block.trim();
    if (!block) continue;

    let mediaType: PortfolioItem['mediaType'] = 'image';
    let mediaUrl = '';
    let aspectRatio: string | undefined = undefined;
    let youtubeId: string | undefined = undefined;
    let vimeoId: string | undefined = undefined;
    let metaText = '';

    const instaMatch = block.match(/<div\s+style="--ratio:\s*([^;]+);[\s\S]*?<iframe\s+src="([^"]+)"[\s\S]*?<\/div>/i);
    const rawIframeMatch = !instaMatch ? block.match(/<iframe\s+src="([^"]+)"[\s\S]*?<\/iframe>/i) : null;
    const videoMatch = block.match(/<video[\s\S]*?src="([^"]+)"[\s\S]*?<\/video>/i);
    const imgMatch = block.match(/!\[(.*?)\]\((https?:\/\/[^\s\)]+)\)/i);

    if (instaMatch) {
      mediaType = 'instagram';
      aspectRatio = instaMatch[1].trim();
      mediaUrl = instaMatch[2].trim();
      metaText = block.slice(instaMatch.index! + instaMatch[0].length).trim();
    } else if (rawIframeMatch) {
      mediaType = 'instagram';
      mediaUrl = rawIframeMatch[1].trim();
      metaText = block.slice(rawIframeMatch.index! + rawIframeMatch[0].length).trim();
    } else if (videoMatch) {
      mediaType = 'video';
      mediaUrl = videoMatch[1].trim();
      metaText = block.slice(videoMatch.index! + videoMatch[0].length).trim();
    } else if (imgMatch) {
      const url = imgMatch[2].trim();
      const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/i);
      const vm = url.match(/vimeo\.com\/(\d+)/i);
      if (yt) {
        mediaType = 'youtube';
        youtubeId = yt[1];
        mediaUrl = url;
      } else if (vm) {
        mediaType = 'vimeo';
        vimeoId = vm[1];
        mediaUrl = url;
      } else {
        mediaType = 'image';
        mediaUrl = url;
      }
      metaText = block.slice(imgMatch.index! + imgMatch[0].length).trim();
    } else {
      continue;
    }

    metaText = metaText.replace(/^[-*]\s*/, '').trim();

    // 1. Extract link: [Link](url) or [View](url) or [Website](url)
    let linkUrl = '';
    const linkMatch = metaText.match(/\[(?:Link|View|Website)\]\((https?:\/\/[^\)]+)\)/i);
    if (linkMatch) {
      linkUrl = linkMatch[1];
      metaText = metaText.replace(linkMatch[0], '').trim();
    }

    // 2. Extract tags: #Tag or #Tag-Name (supporting / such as #M/V-Direction)
    const tags: string[] = [];
    const hashMatches = Array.from(metaText.matchAll(/(?:^|\s)#([a-zA-Z가-힣0-9_/-]+)/g));
    for (const h of hashMatches) {
      tags.push(h[1]);
    }
    metaText = metaText.replace(/(?:^|\s)#[a-zA-Z가-힣0-9_/-]+/g, '').trim();

    // Bracket tags like [Brand Identity, Digital, Editorial Design]
    const bracketTagsMatch = metaText.match(/\[([a-zA-Z0-9\s,_/\-]+)\]$/);
    if (bracketTagsMatch) {
      const bTags = bracketTagsMatch[1].split(',').map((t) => t.trim()).filter(Boolean);
      tags.push(...bTags);
      metaText = metaText.replace(bracketTagsMatch[0], '').trim();
    }

    // 3. Extract primary Title and trailing text segments (with wikilinks)
    const firstWikiMatch = metaText.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
    let title = '';
    let wikilinkTarget = '';
    let trailingRaw = '';

    if (firstWikiMatch) {
      const prefix = metaText.slice(0, firstWikiMatch.index).trim();
      wikilinkTarget = firstWikiMatch[1].trim();
      const display = (firstWikiMatch[2] || firstWikiMatch[1]).trim();
      title = prefix ? `${prefix} ${display}` : display;
      trailingRaw = metaText.slice(firstWikiMatch.index! + firstWikiMatch[0].length).trim();
    } else {
      title = metaText;
      trailingRaw = '';
    }

    // Parse trailingRaw into structured segments (plain text and/or wikilinks)
    const trailingSegments: TextSegment[] = [];
    if (trailingRaw) {
      let cursor = 0;
      const wikiRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
      let m: RegExpExecArray | null;
      while ((m = wikiRegex.exec(trailingRaw)) !== null) {
        if (m.index > cursor) {
          trailingSegments.push({ text: trailingRaw.slice(cursor, m.index) });
        }
        trailingSegments.push({
          text: (m[2] || m[1]).trim(),
          wikilink: m[1].trim(),
        });
        cursor = m.index + m[0].length;
      }
      if (cursor < trailingRaw.length) {
        trailingSegments.push({ text: trailingRaw.slice(cursor) });
      }
    }

    if (!title && !metaText) {
      title = mediaType === 'instagram' ? 'Instagram Post' : 'Portfolio Work';
    }

    items.push({
      id: items.length + 1,
      mediaType,
      mediaUrl,
      aspectRatio,
      youtubeId,
      vimeoId,
      title: title || 'Work',
      wikilinkTarget: wikilinkTarget || undefined,
      trailingSegments,
      linkUrl: linkUrl || undefined,
      tags: Array.from(new Set(tags)),
    });
  }

  if (items.length === 0) return null;

  return {
    beforeMarkdown,
    items,
    afterMarkdown,
  };
}
