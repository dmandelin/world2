<script lang="ts">
    import type { Activity } from "../../model/decisions/effort";
    import type { Process } from "../../model/econ/process";
    import { sortedByKey } from "../../model/lib/basics";
    import { pct, unsigned } from "../../model/lib/format";
    import { type ClanDTO } from "../../model/records/dtos";
    import MiniBarGraph, { type MiniBarData } from "../widgets/MiniBarGraph.svelte";

    let { clan, m }: { clan: ClanDTO, m: ReadonlyMap<Activity|Process, number> } = $props();

    let effortData = $derived.by(() => {
        const data: MiniBarData[] = [];
        for (const [aop, effort] of sortedByKey(m.entries(), ([a, _]) => a.sortKey)) {
            data.push({
                value: effort,
                label: aop.shortName ?? '',
                color: aop.color,
                tooltip: `${aop.name}: ${pct(effort)} (${unsigned(effort * clan.effort)})`
            });
        }
        return data;
    });
</script>

<MiniBarGraph data={effortData} />