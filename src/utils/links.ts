export interface ExternalLinkItem {
  label: string;
  url: string;
  type:
    | 'instagram'
    | 'website'
    | 'youtube'
    | 'twitter'
    | 'linkedin'
    | 'spotify'
    | 'soundcloud'
    | 'bandcamp'
    | 'wiki'
    | 'other';
}

export function detectLinkType(url: string): { label: string; type: ExternalLinkItem['type'] } {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host.includes('instagram.com')) return { label: 'Instagram', type: 'instagram' };
    if (host.includes('youtube.com') || host.includes('youtu.be')) return { label: 'YouTube', type: 'youtube' };
    if (host.includes('twitter.com') || host.includes('x.com')) return { label: 'X (Twitter)', type: 'twitter' };
    if (host.includes('linkedin.com')) return { label: 'LinkedIn', type: 'linkedin' };
    if (host.includes('spotify.com')) return { label: 'Spotify', type: 'spotify' };
    if (host.includes('soundcloud.com')) return { label: 'SoundCloud', type: 'soundcloud' };
    if (host.includes('bandcamp.com')) return { label: 'Bandcamp', type: 'bandcamp' };
    if (host.includes('namu.wiki') || host.includes('wikipedia.org')) return { label: 'Wiki', type: 'wiki' };

    // Format host as clean domain name, e.g. "weare23.com"
    const cleanHost = host.replace(/^www\./, '');
    return { label: cleanHost, type: 'website' };
  } catch {
    return { label: 'Link', type: 'other' };
  }
}

export function getAllExternalLinks(props: Record<string, any> = {}): ExternalLinkItem[] {
  const result: ExternalLinkItem[] = [];
  const seenUrls = new Set<string>();

  function addUrl(urlStr: string, forcedLabel?: string, forcedType?: ExternalLinkItem['type']) {
    if (!urlStr || typeof urlStr !== 'string') return;
    const trimmed = urlStr.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return;
    if (seenUrls.has(trimmed)) return;
    seenUrls.add(trimmed);

    const detected = detectLinkType(trimmed);
    result.push({
      url: trimmed,
      label: forcedLabel || detected.label,
      type: forcedType || detected.type,
    });
  }

  // 1. Instagram
  if (props.IG) {
    const igs = Array.isArray(props.IG) ? props.IG : [props.IG];
    igs.forEach((u: string) => addUrl(u, 'Instagram', 'instagram'));
  }

  // 2. Website
  if (props.Website) {
    const webs = Array.isArray(props.Website) ? props.Website : [props.Website];
    webs.forEach((u: string) => addUrl(u, 'Website', 'website'));
  }

  // 3. URLs
  if (props.URL) {
    const urls = Array.isArray(props.URL) ? props.URL : [props.URL];
    urls.forEach((u: string) => addUrl(u));
  }

  // 4. Wikis
  if (props.Wikis) {
    const wikis = Array.isArray(props.Wikis) ? props.Wikis : [props.Wikis];
    wikis.forEach((u: string) => addUrl(u, 'Wiki Reference', 'wiki'));
  }

  return result;
}
