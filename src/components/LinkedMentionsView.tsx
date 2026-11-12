import React, { useState, useMemo } from 'react';
import type { NoteItem } from '../types';
import { Link2, ChevronDown, ChevronRight, FileText, ArrowRight } from 'lucide-react';

interface BacklinkItem {
  sourceId: string;
  context: string;
}

interface LinkedMentionsViewProps {
  currentNote: NoteItem | null;
  allNotes: NoteItem[];
  backlinks: Record<string, BacklinkItem[]> | null;
  onSelectNote: (note: NoteItem) => void;
}

interface MentionGroup {
  sourceId: string;
  sourceNote?: NoteItem;
  contexts: string[];
}

export const LinkedMentionsView: React.FC<LinkedMentionsViewProps> = ({
  currentNote,
  allNotes,
  backlinks,
  onSelectNote,
}) => {
  // Track collapsed state per group (default: all expanded)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Targets to look up for currentNote
  const searchTargets = useMemo(() => {
    if (!currentNote) return [];
    const list = [currentNote.id, currentNote.title];
    if (currentNote.aliases && Array.isArray(currentNote.aliases)) {
      list.push(...currentNote.aliases);
    }
    return Array.from(new Set(list.filter(Boolean)));
  }, [currentNote]);

  // Aggregate and group backlinks by source note
  const groups: MentionGroup[] = useMemo(() => {
    if (!currentNote || !backlinks) return [];

    const rawList: BacklinkItem[] = [];
    const currentIdLower = currentNote.id.toLowerCase();
    const currentTitleLower = currentNote.title.toLowerCase();

    for (const target of searchTargets) {
      const key = target.toLowerCase();
      const entries = backlinks[key];
      if (entries && Array.isArray(entries)) {
        for (const entry of entries) {
          // Exclude self backlinks
          if (
            entry.sourceId.toLowerCase() === currentIdLower ||
            entry.sourceId.toLowerCase() === currentTitleLower
          ) {
            continue;
          }
          rawList.push(entry);
        }
      }
    }

    if (rawList.length === 0) return [];

    // Map sourceId -> NoteItem
    const noteMap = new Map<string, NoteItem>();
    for (const n of allNotes) {
      noteMap.set(n.id.toLowerCase(), n);
      noteMap.set(n.title.toLowerCase(), n);
    }

    const groupMap = new Map<string, MentionGroup>();

    for (const item of rawList) {
      const existing = groupMap.get(item.sourceId);
      if (existing) {
        if (!existing.contexts.includes(item.context)) {
          existing.contexts.push(item.context);
        }
      } else {
        const sourceNote = noteMap.get(item.sourceId.toLowerCase());
        groupMap.set(item.sourceId, {
          sourceId: item.sourceId,
          sourceNote,
          contexts: [item.context],
        });
      }
    }

    // Sort by source note title
    return Array.from(groupMap.values()).sort((a, b) =>
      a.sourceId.localeCompare(b.sourceId, 'ko', { sensitivity: 'base' })
    );
  }, [currentNote, searchTargets, backlinks, allNotes]);

  const totalMentions = useMemo(() => {
    return groups.reduce((acc, g) => acc + g.contexts.length, 0);
  }, [groups]);

  const toggleGroup = (sourceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedGroups((prev) => ({
      ...prev,
      [sourceId]: !prev[sourceId],
    }));
  };

  const handleGroupClick = (group: MentionGroup) => {
    if (group.sourceNote) {
      onSelectNote(group.sourceNote);
    } else {
      // Fallback placeholder note if not in notes array
      const placeholder: NoteItem = {
        id: group.sourceId,
        title: group.sourceId,
        hash: '',
        folderType: 'wiki',
        aliases: [],
        category: '',
        subCategory: '',
        field: '',
        subField: '',
        type: '',
        subType: '',
        topic: '',
        topics: [],
        ig: '',
        website: '',
        cities: [],
        countries: [],
        tldr: '',
        info: '',
      };
      onSelectNote(placeholder);
    }
  };

  // Format context snippet with Obsidian-like highlight for the target wikilink
  const formatContextHtml = (context: string) => {
    // Strip leading list bullet: '- ' or '* '
    let text = context.replace(/^[-*]\s+/, '').trim();

    // Replace target wikilinks [[Target]] or [[Target|Display]] with yellow highlight
    text = text.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, tgt, disp) => {
      const cleanTgt = tgt.trim();
      const display = (disp || tgt).trim();
      const isTarget = searchTargets.some(
        (t) => t.toLowerCase() === cleanTgt.toLowerCase()
      );
      if (isTarget) {
        return `<span class="bg-[#fef08a] text-black font-mono text-[11px] font-semibold px-1 py-0.5 rounded border border-[#fde047]/70">[[${display}]]</span>`;
      }
      return `<span class="font-medium text-black">[[${display}]]</span>`;
    });

    return text;
  };

  if (!currentNote) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-[#999999] text-xs font-mono">
        <Link2 className="w-4 h-4 mb-1.5 opacity-30" />
        <span>Select a note to view mentions</span>
      </div>
    );
  }

  if (totalMentions === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-[#999999] text-xs font-mono">
        <Link2 className="w-4 h-4 mb-1.5 opacity-30" />
        <span>No linked mentions found</span>
        <span className="text-[10px] text-[#bbbbbb] mt-1">This note is not backlinked by other notes</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto px-3 py-2 space-y-2 [scrollbar-width:thin] text-left">
      {groups.map((group) => {
        const isCollapsed = Boolean(collapsedGroups[group.sourceId]);
        const mentionCount = group.contexts.length;

        return (
          <div
            key={group.sourceId}
            className="group/item flex flex-col border border-[#e8e8e8] hover:border-black/20 rounded-xl bg-white shadow-2xs transition-all overflow-hidden"
          >
            {/* Source Note Header */}
            <div
              onClick={() => handleGroupClick(group)}
              className="px-3 py-2 flex items-center justify-between bg-white hover:bg-[#fafafa] cursor-pointer transition-colors border-b border-[#f0f0f0]"
            >
              <div className="flex items-center gap-1.5 min-w-0 pr-2">
                <button
                  type="button"
                  onClick={(e) => toggleGroup(group.sourceId, e)}
                  aria-label={isCollapsed ? 'Expand mentions' : 'Collapse mentions'}
                  className="p-0.5 rounded text-[#888888] hover:text-black hover:bg-[#ebebeb] transition-colors shrink-0"
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                <FileText className="w-3.5 h-3.5 text-[#888888] shrink-0" />

                <span className="font-semibold text-xs text-black truncate tracking-tight group-hover/item:text-black">
                  {group.sourceId}
                </span>

                {group.sourceNote?.topic && (
                  <span className="hidden sm:inline-block font-mono text-[9px] text-[#888888] bg-[#f5f5f7] px-1.5 py-0.2 rounded border border-black/5 uppercase shrink-0">
                    {group.sourceNote.topic}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="font-mono text-[10px] text-[#888888] bg-[#f5f5f7] px-1.5 py-0.5 rounded-full font-medium">
                  {mentionCount}
                </span>
                <ArrowRight className="w-3 h-3 text-[#cccccc] group-hover/item:text-black group-hover/item:translate-x-0.5 transition-all" />
              </div>
            </div>

            {/* Context Snippet List (if not collapsed) */}
            {!isCollapsed && (
              <div
                onClick={() => handleGroupClick(group)}
                className="p-2 space-y-1.5 bg-[#fcfcfd] cursor-pointer hover:bg-[#f8f8fa] transition-colors"
              >
                {group.contexts.map((ctx, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-white border border-[#e5e5e7] text-[11px] leading-relaxed font-sans text-[#333333] shadow-2xs hover:border-black/30 transition-all select-text"
                    dangerouslySetInnerHTML={{ __html: formatContextHtml(ctx) }}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
