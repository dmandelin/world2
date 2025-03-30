<script lang="ts">
    import PopulationPyramid from "./PopulationPyramid.svelte";

    let { settlement } = $props();

</script>

<h4>Assessments</h4>

<table><tbody>
<tr>
    <td></td>
    {#each settlement.clans as c}
        <td>{c.name.substr(0, 1)}</td>
    {/each}
</tr>
{#each settlement.clans as c}
<tr>
    <td>{c.name}</td>
    {#each settlement.clans as d}
        <td>
            {#if c === d}
            -
            {:else}
            {c.assessments.get(d) ?? 50}
            {/if}
        </td>
    {/each}
</tr>
{/each}
</tbody></table>