<script>
    import Land from '../components/Land.svelte';
    import Map from '../components/Map.svelte';
    import Settlement from '../components/Settlement.svelte';
    import { world } from '../model/world';

    let selectedSettlement = $state(world.settlements[0]);
</script>

<style>
    :global(body) {
        font-family: "PT Serif", Arial, sans-serif;
        background-color: #f9f6eb;
        color: #2c250d;
    }
</style>

<div style="display: flex;">
    <Map bind:selection={selectedSettlement} />
    {#if selectedSettlement}
    <Settlement settlement={selectedSettlement} />
    {:else}
    <Land world={world}/>
    {/if}
</div>