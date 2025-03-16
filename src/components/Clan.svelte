<script lang="ts">
    import PopulationPyramid from "./PopulationPyramid.svelte";

    let { clan } = $props();

</script>

{#if clan !== undefined}
<h3>{clan.name}</h3>

<p>{clan.parent ? `Junior branch of ${clan.parent.name} of ${clan.parent.settlement.name}` : 'Senior clan'}</p>
{#if clan.cadets.length > 0}
<p>Cadet branches:</p>
<ul>
    {#each clan.cadets as cadet}
    <li>{cadet.name} of {cadet.settlement.name}</li>
    {/each}
</ul>
{/if}

<PopulationPyramid {clan} />

{/if}