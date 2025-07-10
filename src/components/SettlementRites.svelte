<script lang="ts">
    import { pct, spct } from "../model/lib/format";

    import DataTable from "./DataTable.svelte";
    import Tooltip from "./Tooltip.svelte";

    let { settlement } = $props();

    let selectionOptions = $derived.by(
        () => settlement.rites.leaderSelectionOptions);
</script>

<style>
    table.selection-options {
        border-collapse: collapse;
        border: 1px solid #ccc;
    }

    table.selection-options th,
    table.selection-options td {
        padding: 0.25em;
        text-align: center;
        border: 1px solid #ccc;
    }
</style>

{#each settlement.rites as rites}
    {#if rites.held}
        <h4 style="margin-top: 1em;">{rites.name}</h4>
        Leader selection: {rites.leaderSelectionOption}

        <div style="display: flex; flex-direction: row; gap: 2em;">
            <div>
                <h5>Appeal {rites.appeal.toFixed()}</h5>
                <div class="ttt">
                    <DataTable rows={rites.appealItems} />
                </div>
            </div>

            <div>
                <h5>Quality {pct(rites.quality)}</h5>
                <div class="ttt">
                    <DataTable rows={rites.qualityItems} />
                </div>
            </div>

            <div>
                <h5>Scale {pct(rites.perCapitaOutput)}</h5>
                <div class="ttt">
                    <DataTable rows={rites.outputItems} />
                </div>
            </div>
        </div>
    {:else}
        <h4 style="margin-top: 1em">{rites.name}</h4>
    {/if}
{/each}

{#if selectionOptions && selectionOptions.length > 0}
<hr>
<h4>Selection Options</h4>
<table class="selection-options">
    <thead>
        <tr>
            <th>Option</th>
            <th>Quality</th>
            {#each selectionOptions[0].clanImpacts.keys() as clan}
            <th colspan="4">{clan.name}</th>
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
                        Weight:
                        {impact.originalWeight.toFixed(2)} &rarr; {impact.newWeight.toFixed(2)}
                    </div>
                </Tooltip>
            </td>
            <td>
                <Tooltip>
                    {impact.qolDelta.toFixed(1)}
                    <div slot="tooltip">
                        QoL:
                        {impact.originalQoL.toFixed(1)} &rarr; {impact.newQoL.toFixed(1)}
                    </div>
                </Tooltip>
            </td>
            <td>
                <Tooltip>
                    {impact.prestigeDelta.toFixed(1)}
                    <div slot="tooltip">
                        Prestige:
                        {impact.originalPrestige.toFixed(1)} &rarr; {impact.newPrestige.toFixed(1)}
                    </div>
                </Tooltip>
            </td>
            <td>{impact.delta.toFixed(1)}</td>
            {/each}
        </tr>
        {/each}
    </tbody>
</table>
{/if}