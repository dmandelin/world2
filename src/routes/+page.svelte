<script>
    import Land from '../components/Land.svelte';
    import Map from '../components/Map.svelte';
    import SettlementArea from '../components/SettlementArea.svelte';
    import Sidebar from '../components/Sidebar.svelte';
    import { world as _world } from '../model/world';

    let world = $state(_world.dto);
    let _selectedSettlement = $state(_world.settlements[0]);
    let selectedSettlement = $derived.by(() => 
        _selectedSettlement
            ? world.settlements.find(s => s.name === _selectedSettlement.name) || undefined
            : undefined);

    _world.watch(() => {
        world = _world.dto;
    });
</script>

<style>
    :global(body) {
        font-family: "PT Serif", Arial, sans-serif;
        background-color: #f9f6eb;
        color: #2c250d;
    }
</style>

<div style="display: flex;">
    <Map bind:selection={_selectedSettlement} />
    {#if selectedSettlement}
    <SettlementArea settlement={selectedSettlement} />
    {:else}
    <Land world={world}/>
    {/if}
</div>
<Sidebar world={world} />