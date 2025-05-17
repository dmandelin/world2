<script lang="ts">
    import DataTable from "./DataTable.svelte";
    import Tooltip from "./Tooltip.svelte";

    let { settlement } = $props();
    let clans = $derived(settlement.clans);
</script>

<style>
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

<div>
{#if clans.condorcet.leader}
Leading clan: {clans.condorcet.leader.name}
{:else}
No leading clan
{/if}
</div>

<h4>Prestige attributed</h4>

<table><tbody>
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
                {#if c === d}
                -
                {:else}
                <Tooltip>
                    {(c.prestige.get(d.ref).value.toFixed())}
                    <div slot="tooltip">
                        <DataTable rows={c.prestige.get(d.ref).tooltip} />
                    </div>
                </Tooltip>
                {/if}
            </td>
        {/each}
    </tr>
    {/each}
    </tbody></table>

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
                    {clans.condorcet.wins[i][j]}
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

<h3>Relatedness</h3>
<table><tbody>
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
                {#if c === d}
                -
                {:else}
                <Tooltip>
                    {(c.assessments.alignment(d.ref) * 100).toFixed()}
                    <div slot="tooltip">
                        <DataTable rows={c.assessments.get(d.ref).asTable} />
                    </div>
                </Tooltip>
                {/if}
            </td>
        {/each}
    </tr>
    {/each}
    </tbody></table>