<script lang="ts">
    import type { ClanDTO } from '../../model/records/dtos';
    import NewsTable, { type NewsRow } from '../information/NewsTable.svelte';

    let { clan }: { clan: ClanDTO } = $props();
    let world = $derived(clan.world);

    // What the clan took in about other clans over the last turn: the same
    // listing as "Everything X knows" in the settlement information panel,
    // restricted to this turn's news, which has not yet passed into memory
    // as far as the views are concerned.
    let rows = $derived.by((): NewsRow[] => {
        const out: NewsRow[] = [];
        for (const [other, items] of world.newsFor(clan)) {
            for (const entry of items) {
                out.push({ entry, about: other, knownBy: [], recountable: true });
            }
        }
        return out.sort((a, b) => b.entry.year - a.entry.year);
    });
</script>

<h4 style="margin: 0 0 0.5rem 0;">
    Everything {clan.name} learned last turn
    <span style="font-weight: normal; color: #666;"
        >({rows.length} event{rows.length === 1 ? "" : "s"})</span
    >
</h4>
<NewsTable {rows} {world} showAbout emptyText="No news about other clans last turn." />
