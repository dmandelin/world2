<script lang="ts">
  import type { Note, NoteEntity } from "../model/records/notifications";
  import EntityLink from "./state/EntityLink.svelte";

  let { notes }: { notes: Note[] } = $props();

  // Icon and color config by note type
  function noteStyle(shortLabel: string): { icon: string; color: string; tag: string } {
      switch (shortLabel) {
          case '✨': return { icon: '✨', color: '#b7791f', tag: 'Founding' };
          case '↔': return { icon: '↔️', color: '#2b6cb0', tag: 'Migration' };
          case 'H': return { icon: '🏠', color: '#6b46c1', tag: 'Housing' };
          default: return { icon: '📝', color: '#718096', tag: 'Event' };
      }
  }

  // Parse message with {0}, {1} placeholders into segments
  interface MessageSegment {
      type: 'text' | 'entity';
      text?: string;
      entity?: NoteEntity;
  }

  function parseMessage(message: string, entities: NoteEntity[]): MessageSegment[] {
      const segments: MessageSegment[] = [];
      const regex = /\{(\d+)\}/g;
      let lastIndex = 0;
      let match;
      while ((match = regex.exec(message)) !== null) {
          if (match.index > lastIndex) {
              segments.push({ type: 'text', text: message.slice(lastIndex, match.index) });
          }
          const idx = parseInt(match[1]);
          if (idx < entities.length) {
              segments.push({ type: 'entity', entity: entities[idx] });
          } else {
              segments.push({ type: 'text', text: match[0] });
          }
          lastIndex = regex.lastIndex;
      }
      if (lastIndex < message.length) {
          segments.push({ type: 'text', text: message.slice(lastIndex) });
      }
      return segments;
  }

  // Group notes by year, most recent first
  interface YearGroup {
      year: string;
      isCentury: boolean;
      notes: Note[];
  }

  let yearGroups = $derived.by(() => {
      // Build groups preserving insertion order (chronological), then reverse
      const map = new Map<string, Note[]>();
      for (const note of notes) {
          if (note.shortLabel === '$vr$') continue; // Skip year-break markers
          if (!map.has(note.year)) map.set(note.year, []);
          map.get(note.year)!.push(note);
      }
      const groups: YearGroup[] = [];
      for (const [year, yearNotes] of map) {
          // Determine if this is an even century (e.g. 6400 BC, 6200 BC)
          const numMatch = year.match(/^(\d+)/);
          const num = numMatch ? parseInt(numMatch[1]) : 0;
          const isCentury = num % 200 === 0;
          groups.push({ year, isCentury, notes: yearNotes });
      }
      groups.reverse(); // Most recent on top
      return groups;
  });
</script>

<style>
    .event-log {
        max-height: 250px;
        overflow-y: auto;
        font-size: 0.8rem;
        line-height: 1.4;
        scrollbar-width: thin;
        scrollbar-color: #c4b98a transparent;
    }

    .year-group {
        position: relative;
    }

    .year-divider {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 2px 0;
        margin: 0;
    }

    .year-divider .line {
        flex: 1;
        border: none;
        border-top: 1px dotted #c4b98a;
        margin: 0;
    }

    .year-divider.century .line {
        border-top: 2px solid #a08c5a;
    }

    .year-label {
        font-size: 0.65rem;
        color: #a08c5a;
        white-space: nowrap;
        user-select: none;
        font-variant-numeric: tabular-nums;
    }

    .year-divider.century .year-label {
        font-weight: 700;
        font-size: 0.7rem;
        color: #62531d;
    }

    .note-row {
        display: flex;
        align-items: flex-start;
        gap: 6px;
        padding: 2px 4px;
        border-radius: 3px;
        transition: background-color 0.15s;
    }

    .note-row:hover {
        background-color: rgba(98, 83, 29, 0.06);
    }

    .note-icon {
        flex-shrink: 0;
        width: 18px;
        text-align: center;
        font-size: 0.75rem;
        line-height: 1.4;
    }

    .note-message {
        color: #2c250d;
    }

    .note-tag {
        flex-shrink: 0;
        font-size: 0.6rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        padding: 1px 5px;
        border-radius: 3px;
        line-height: 1.5;
        white-space: nowrap;
    }

    .note-text {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
    }

    .note-subtext {
        font-size: 0.7rem;
        color: #a08c5a;
        line-height: 1.3;
    }

    .empty-state {
        text-align: center;
        padding: 1rem;
        color: #a08c5a;
        font-style: italic;
        font-size: 0.75rem;
    }
</style>

<div class="event-log">
    {#if yearGroups.length === 0}
        <div class="empty-state">No events yet.</div>
    {:else}
        {#each yearGroups as group}
            <div class="year-group">
                <div class="year-divider" class:century={group.isCentury}>
                    <span class="year-label">{group.year}</span>
                    <hr class="line" />
                </div>
                {#each group.notes as note}
                    {@const style = noteStyle(note.shortLabel)}
                    {@const segments = parseMessage(note.message, note.entities)}
                    <div class="note-row">
                        <span class="note-icon">{style.icon}</span>
                        <div class="note-text">
                            <span class="note-message">
                                {#each segments as seg}
                                    {#if seg.type === 'entity' && seg.entity}
                                        <EntityLink entity={seg.entity} />
                                    {:else}
                                        {seg.text}
                                    {/if}
                                {/each}
                            </span>
                            {#if note.tooltip}
                                <span class="note-subtext">{note.tooltip}</span>
                            {/if}
                        </div>
                        <span class="note-tag" style="color: {style.color}; background-color: {style.color}18;">{style.tag}</span>
                    </div>
                {/each}
            </div>
        {/each}
    {/if}
</div>
