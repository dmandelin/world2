<script lang="ts">
    import { spct } from "../model/lib/format";
    import ClanProductionCard from "./ClanProductionCard.svelte";

    let { settlement } = $props();
</script>

<div style="display: flex; gap: 0.5rem;">
    {#each settlement.clans as clan}
    <ClanProductionCard clan={clan} />
    {/each}
</div>

{#if settlement.clans.pot.contributors}
<h4 style="text-align: center; margin-top: 1em;">Common Produce</h4>
<table style="width: 200px; margin: 0 auto;">
    <tbody>
        <tr>
            <td>Contributors</td>
            <td>{settlement.clans.pot.contributors.toFixed()}</td>
        </tr>
        <tr>
            <td>Base Produce</td>
            <td>{settlement.clans.pot.input.toFixed()}</td>
        </tr>
        <tr>
            <td>Scale Modifier</td>
            <td>{spct(settlement.clans.pot.scaleFactor)}</td>
        </tr>
        <tr>
            <td>Produce</td>
            <td>{settlement.clans.pot.output.toFixed()}</td>
        </tr>
        <tr>
            <td>TFP</td>
            <td>{spct(settlement.clans.pot.tfp)}</td>
        </tr>
    </tbody>
</table>
{/if}
