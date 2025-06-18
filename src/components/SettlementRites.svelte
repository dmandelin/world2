<script lang="ts">
    import { pct, spct } from "../model/format";
    import { CommonRitesStructure, GuidedRitesStructure, NoScrubsRitesStructure, Rites, RitualLeaderSelectionOptions } from "../model/rites";
    import DataTable from "./DataTable.svelte";
    import Tooltip from "./Tooltip.svelte";

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
<table>
    <tbody>
        {#each selectionOptions as so}
        <tr>
            <td>{so.name}</td>
            <td>
                <Tooltip>
                    {pct(so.rites.quality)}
                    <div slot="tooltip">
                        <b>Effectiveness</b>
                        <DataTable rows={so.rites.baseEffectivenessItems} />
                        <b>Quality</b>
                        <DataTable rows={so.rites.items} />
                    </div>
                </Tooltip>
            </td>
        </tr>
        {/each}
    </tbody>
</table>
