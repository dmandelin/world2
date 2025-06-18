<script lang="ts">
    import { pct, spct } from "../model/format";
    import { CommonRitesStructure, GuidedRitesStructure, NoScrubsRitesStructure, Rites, RitualLeaderSelectionOptions } from "../model/rites";
    import DataTable from "./DataTable.svelte";
    import Tooltip from "./Tooltip.svelte";

    let { settlement } = $props();

    let selectionOptions = $derived.by(
        () => settlement.clans.rites.leaderSelectionOptions);
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
    <thead>
        <tr>
            <th>Option</th>
            <th>Quality</th>
            {#each settlement.clans as clan}
            <th colspan="2">{clan.name}</th>
            {/each}
        </tr>
    </thead>
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
            {#each so.clanImpacts.values() as impact}
            <td>
                <Tooltip>
                    {pct(impact.weightDelta)}
                    <div slot="tooltip">
                        n/a
                    </div>
                </Tooltip>
            </td>
            <td>
                <Tooltip>
                    {impact.qolDelta.toFixed(1)}
                    <div slot="tooltip">
                        {impact.originalQoL.toFixed(1)} &rarr; {impact.newQoL.toFixed(1)}
                    </div>
                </Tooltip>
            </td>
            {/each}
        </tr>
        {/each}
    </tbody>
</table>
