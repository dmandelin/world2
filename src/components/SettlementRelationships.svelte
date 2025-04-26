<script lang="ts">
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
                        <table>
                            <tbody>
                                {#each c.assessments.get(d.ref).asTable as row}
                                <tr>
                                    {#each row as cell}
                                    <td>{cell}</td>
                                    {/each}
                                </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                </Tooltip>
                {/if}
            </td>
        {/each}
    </tr>
    {/each}
    </tbody></table>