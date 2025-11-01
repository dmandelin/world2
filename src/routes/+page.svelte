<script lang="ts">
    import ClanDetails from '../components/clan/ClanDetails.svelte';
    import Land from '../components/Land.svelte';
    import Map from '../components/Map.svelte';
    import SettlementCluster from '../components/SettlementCluster.svelte';
    import Sidebar from '../components/Sidebar.svelte';
    import EntityLink from '../components/state/EntityLink.svelte';
    import {selectSettlement, uiState, worldState} from '../components/state/uistate.svelte';
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
<div style="display: flex; gap: 1rem">
    <Map onSelect={selectSettlement} />
    {#if uiState().selectedClan}
        <div>
            <h4 style="margin-top: 0">
                <EntityLink entity={uiState().selectedClan!.ref.settlement} />
                &gt;
                Clan {uiState().selectedClan!.name}
            </h4>
            <ClanDetails clan={uiState().selectedClan!} />
        </div>
    {:else if uiState().selectedSettlement}
        <SettlementCluster settlement={uiState().selectedSettlement!} onSelect={selectSettlement} />
    {:else}
        <Land world={worldState()} />
    {/if}
</div>
<Sidebar world={worldState()} />