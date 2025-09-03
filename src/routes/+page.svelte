<script lang="ts">
    import Land from '../components/Land.svelte';
    import Map from '../components/Map.svelte';
    import SettlementCluster from '../components/SettlementCluster.svelte';
    import Sidebar from '../components/Sidebar.svelte';
    import { world as _world } from '../model/world';

    let world = $state(_world.dto);
    let selectedSettlementUUID: string|undefined = $state(_world.allSettlements[0]!.uuid);
    let selectedSettlement = $derived.by(() =>
        selectedSettlementUUID &&
        world.settlements.find(s => s.uuid === selectedSettlementUUID));

    _world.watch(() => {
        world = _world.dto;
    });

    function selectSettlement(uuid: string|undefined) {
        selectedSettlementUUID = uuid;
    }
</script>

<style>
    :global(body) {
        font-family: "PT Serif", Arial, sans-serif;
        background-color: #f9f6eb;
        color: #2c250d;
    }
</style>

<a
    href="https://github.com/dmandelin/world2/blob/main/README.md"
    target="_blank"
    rel="noopener"
    style="
        position: absolute;
        top: 16px;
        left: 16px;
        z-index: 1000;
        background: rgba(255,255,255,0.9);
        padding: 6px 14px;
        border-radius: 6px;
        text-decoration: none;
        color: #2c250d;
        font-weight: bold;
        box-shadow: 0 2px 8px rgba(0,0,0,0.07);
    "
>
    &#x1F517; What is this?
</a>
<div style="display: flex;">
    <Map onSelect={selectSettlement} />
    {#if selectedSettlement}
        <SettlementCluster settlement={selectedSettlement} onSelect={selectSettlement} />
    {:else}
        <Land world={world}/>
    {/if}
</div>
<Sidebar world={world} />