<script lang="ts">
    import DataTable from "./DataTable.svelte";
    import Tooltip from "./Tooltip.svelte";
    import { averagePrestigeTable } from "./tables";
    import type { AlignmentCalc } from "../model/people/alignment";
    import { signed } from "../model/lib/format";
    
    let { settlement } = $props();
    let clans = $derived(settlement.clans);

    let prestigeTable = $derived(averagePrestigeTable(settlement));

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
    h3, h4 {
        text-align: center;
    }

    table {
        border-collapse: collapse;
        margin: 0 auto;
    }

    td, th {
        padding: 0.5em;
        text-align: center;
        border: 1px solid #ccc;
    }

    #prestige-inferences-table {
        margin-top: 1em;
    }

    #prestige-inferences-table td:first-child {
        text-align: left;
    }
</style>

<div style="display: flex; gap: 2em">

<div>
    <h3>Prestige</h3>
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
                        {signed(c.prestige.get(d.ref)?.value)}
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

    <h4>Average Inferences</h4>
    <table id="prestige-inferences-table">
        <thead>
            <tr>
                {#each prestigeTable.header as cell}
                    <th>{cell}</th>
                {/each}
            </tr>
        </thead>   
        <tbody>
            {#each prestigeTable.rows as row}
                <tr>
                    {#each row as cell}
                        <td>{cell}</td>
                    {/each}
                </tr>
            {/each}
        </tbody>
    </table>
</div>
<div>
    <h3>Alignment</h3>
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
