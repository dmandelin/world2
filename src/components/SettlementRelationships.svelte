<script lang="ts">
    import DataTable from "./DataTable.svelte";
    import Tooltip from "./Tooltip.svelte";
    import type { AlignmentCalc } from "../model/people/alignment";

    let { settlement } = $props();
    let clans = $derived(settlement.clans);

    function prestigeTooltip(calc: AlignmentCalc) {
        const rows = [];
        for (const item of calc.items) {
            rows.push([item.name, item.weight.toFixed(2), item.value.toFixed()]);
        }
        return [
            ['Source', 'Weight', 'Value'],
            ...rows
        ];
    }

    function prestigeInferenceTooltip(calc: AlignmentCalc) {
        const rows = [];
        for (const item of calc.inference.items) {
            rows.push([item.name, item.value.toFixed()]);
        }
        return [
            ['Source', 'Value'],
            ...rows
        ];
    }

    function alignmentTooltip(calc: AlignmentCalc) {
        const rows = [];
        for (const item of calc.items) {
            rows.push([item.name, item.weight.toFixed(2), item.value.toFixed(2)]);
        }
        console.log(rows);
        return [
            ['Source', 'Weight', 'Value'],
            ...rows
        ];
    }

    function alignmentInferenceTooltip(calc: AlignmentCalc) {
        const rows = [];
        for (const item of calc.inference.items) {
            rows.push([item.name, item.value.toFixed(2)]);
        }
        return [
            ['Source', 'Value'],
            ...rows
        ];
    }
</script>

<style>
    h4 {
        text-align: center;
    }

    table {
        border-collapse: collapse;
        margin: 0 auto;
    }

    td {
        padding: 0.5em;
        text-align: center;
        border: 1px solid #ccc;
    }
</style>

<h3>Prestige</h3>

<div style="display: flex; gap: 2em">

<div>
    <h4>Prestige</h4>

    <table>
    <tbody>
        <tr>
            <td></td>
            {#each clans as c}
                <td>{c.name}</td>
            {/each}
        </tr>
        {#each clans as c}
        <tr>
            <td>{c.name}</td>
            {#each clans as d}
                <td>
                    <Tooltip>
                        {(c.prestige.get(d.ref)?.value?.toFixed())}
                        <div slot="tooltip">
                            <b>Sources</b>
                            <DataTable rows={prestigeTooltip(c.prestige.get(d.ref)!)} />
                            <b>Inference</b>
                            <DataTable rows={prestigeInferenceTooltip(c.prestige.get(d.ref)!)} />
                        </div>
                    </Tooltip>
                </td>
            {/each}
        </tr>
        {/each}
        </tbody>
    </table>
</div>
<div>
    <h4>Alignment</h4>
    <table>
    <tbody>
        <tr>
            <td></td>
            {#each clans as c}
                <td>{c.name}</td>
            {/each}
        </tr>
        {#each clans as c}
        <tr>
            <td>{c.name}</td>
            {#each clans as d}
                <td>
                    <Tooltip>
                        {(c.alignment.get(d.ref)?.value?.toFixed(2))}
                        <div slot="tooltip">
                            <b>Sources</b>
                            <DataTable rows={alignmentTooltip(c.alignment.get(d.ref)!)} />
                            <b>Inference</b>
                            <DataTable rows={alignmentInferenceTooltip(c.alignment.get(d.ref)!)} />
                        </div>
                    </Tooltip>
                </td>
            {/each}
        </tr>
        {/each}
        </tbody>
    </table>
</div>
</div>
<!--
<h3>Condorcet pairwise wins</h3>

<table><tbody>
    <tr>
        <td></td>
        {#each clans as c}
            <td>{c.name}</td>
        {/each}
    </tr>
    {#each clans as c, i}
    <tr>
        <td>{c.name}</td>
        {#each clans as d, j}
            <td>
                {#if c === d}
                -
                {:else}
                <Tooltip>
                    {clans.condorcet.wins[i] ? clans.condorcet.wins[i][j] : '?'}
                    <div slot="tooltip">
                        n/a
                    </div>
                </Tooltip>
                {/if}
            </td>
        {/each}
    </tr>
    {/each}
    </tbody></table>
-->
