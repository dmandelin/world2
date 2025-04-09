<script lang="ts">
    import type { ClanDTO } from "./dtos";

    let { clans } = $props();
</script>

<h4>Assessments</h4>

<table><tbody>
<tr>
    <td></td>
    {#each clans as c}
        <td>{c.name.substr(0, 1)}</td>
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
            {(c.assessments.alignment(d.ref) * 100).toFixed()}
            {/if}
        </td>
    {/each}
</tr>
{/each}
</tbody></table>