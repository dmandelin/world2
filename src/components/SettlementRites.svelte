<script lang="ts">
    import { pct, spct } from "../model/format";
    import { CommonRitesStructure, GuidedRitesStructure, NoScrubsRitesStructure, Rites, RitualLeaderSelectionOptions } from "../model/rites";
    import DataTable from "./DataTable.svelte";

    let { settlement } = $props();

    let selections = [
        RitualLeaderSelectionOptions.Equal, 
        RitualLeaderSelectionOptions.PrestigeWeightedSoft, 
        RitualLeaderSelectionOptions.PrestigeWeightedMedium, 
        RitualLeaderSelectionOptions.PrestigeWeightedHard, 
    ];
    let selectionOptions = $derived.by(() => {
        return selections.map((s) => {
            const rites = new Rites(settlement.world, settlement.clans);
            rites.leaderSelectionOption = s;
            rites.perform();

            return {
                name: s.name,
                rites: rites,
            };
        });
    });

    let structures = [new CommonRitesStructure(), new GuidedRitesStructure(), new NoScrubsRitesStructure()];
    let structureOptions = $derived.by(() => {
        return structures.map((s) => {
            const rites = new Rites(settlement.world, settlement.clans);
            rites.structure = s;
            rites.perform();

            return {
                name: s.name,
                rites: rites,
            };
        });
    });
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

<h4>Selection Options</h4>
{#each selectionOptions as so}
    <div>
        <h5>{so.name}: {pct(so.rites.quality)}</h5>
        <DataTable rows={so.rites.items} />
    </div>
{/each}

<h4>Structure Options</h4>
{#each structureOptions as so}
    <div>
        <h5>{so.name}: {pct(so.rites.quality)}</h5>
        <DataTable rows={so.rites.items} />
    </div>
{/each}
