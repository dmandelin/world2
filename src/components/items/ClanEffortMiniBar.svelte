<script lang="ts">
    import { type ClanDTO } from "../../model/records/dtos";
    import MiniBarGraph, { type MiniBarData } from "../widgets/MiniBarGraph.svelte";

    let { clan }: { clan: ClanDTO } = $props();

    let effortData = $derived.by(() => {
        const data: MiniBarData[] = [];
        for (const [activity, effort] of clan.effortAllocation.f.entries()) {
            data.push({
                value: effort,
                label: activity.shortName ?? '',
            });
        }
        return data;
    });
</script>

<MiniBarGraph data={effortData} />