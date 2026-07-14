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

<div style="display: flex; gap: 1rem">
    <Map onSelect={selectSettlement} />
    <div style="flex: 1; min-width: 0;">
        {#if uiState().selectedClan}
            <h4 style="margin-top: 0">
                <EntityLink entity={uiState().selectedClan!.ref.settlement} />
                &gt;
                Clan {uiState().selectedClan!.name}
            </h4>
            <ClanDetails clan={uiState().selectedClan!} />
        {:else if uiState().selectedSettlement}
            <SettlementCluster settlement={uiState().selectedSettlement!} onSelect={selectSettlement} />
        {:else}
            <Land world={worldState()} />
        {/if}
    </div>
</div>
<Sidebar world={worldState()} />