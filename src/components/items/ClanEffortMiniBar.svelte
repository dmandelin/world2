<script lang="ts">
    import { sortedByKey } from "../../model/lib/basics";
    import { pct, unsigned } from "../../model/lib/format";
    import { type ClanDTO } from "../../model/records/dtos";
    import MiniBarGraph, { type MiniBarData } from "../widgets/MiniBarGraph.svelte";

    let { clan }: { clan: ClanDTO } = $props();

    let effortData = $derived.by(() => {
        const data: MiniBarData[] = [];
        for (const [activity, effort] of sortedByKey(clan.effortAllocation, ([a, _]) => a.sortKey)) {
            data.push({
                value: effort,
                label: activity.shortName ?? '',
                color: activity.color,
                tooltip: `${activity.name}: ${pct(effort)} (${unsigned(effort * clan.effort)})`
            });
        }
        return data;
    });
</script>

<MiniBarGraph data={effortData} />