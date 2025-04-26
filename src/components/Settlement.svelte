<script>
    import { spct } from "../model/format";
    import ClanCard from "./ClanCard.svelte";
    import ClanProductionCard from "./ClanProductionCard.svelte";

    let { settlement } = $props();
</script>

<style>
    #top {
        margin-left: 1rem;
    }

    h1 {
        margin: 0 0 1rem 0;
    }

    h3, h4 {
        margin: 0.5rem 0;
    }
</style>

<div id="top">
<h1>{settlement.name}</h1>
<h3>{settlement.size} people</h3>

<h4 style="text-align: center; border-bottom: 1px solid grey">The {settlement.clans.length} clans</h4>
<div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
    {#each settlement.clans as clan}
    <ClanCard clan={clan} />
    {/each}
</div>

<h4 style="text-align: center;">Production</h4>

<div style="display: flex; gap: 0.5rem;">
    {#each settlement.clans as clan}
    <ClanProductionCard clan={clan} />
    {/each}
</div>

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
</div>