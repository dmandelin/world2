<script lang="ts">
    import { pct, spct } from "../model/format";
    import { CommonRitesStructure, GuidedRitesStructure, NoScrubsRitesStructure, Rites } from "../model/rites";
    import DataTable from "./DataTable.svelte";

    let { settlement } = $props();

    let structures = [new CommonRitesStructure(), new GuidedRitesStructure(), new NoScrubsRitesStructure()];
    let structureOptions = $derived.by(() => {
        return structures.map((s) => {
            const rites = new Rites(settlement.clans);
            rites.structure = s;
            rites.perform();

            return {
                name: s.name,
                rites: rites,
            };
        });
    })
</script>

{#if settlement.clans.rites.participants.length}
<h4 style="margin-top: 1em;">{settlement.clans.rites.name}</h4>
Leader selection: {settlement.clans.rites.leaderSelectionOption}

<h5>Effectiveness from participants</h5>
<div class="ttt">
    <DataTable rows={settlement.clans.rites.baseEffectivenessItems} />
</div>

<h5>Quality: {spct(settlement.clans.rites.quality)}</h5>
<div class="ttt">
    <DataTable rows={settlement.clans.rites.items} />
</div>
{/if}

<h4>Options</h4>
{#each structureOptions as so}
    <div>
        <h5>{so.name}: {pct(so.rites.quality)}</h5>
        <DataTable rows={so.rites.items} />
    </div>
{/each}
