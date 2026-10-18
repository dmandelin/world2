<script lang="ts">
    import ClanDetails from "../components/clan/ClanDetails.svelte";
    import Land from "../components/Land.svelte";
    import Map from "../components/Map.svelte";
    import SettlementCluster from "../components/SettlementCluster.svelte";
    import SettlementDecorated from "../components/SettlementDecorated.svelte";
    import Sidebar from "../components/Sidebar.svelte";
    import SettlementRegionPanel from "../components/overview/SettlementRegionPanel.svelte";
    import EntityLink from "../components/state/EntityLink.svelte";
    import {
        selectSettlement,
        uiState,
        worldState,
    } from "../components/state/uistate.svelte";
</script>

<div style="display: flex; gap: var(--clay-gap)">
    <Map onSelect={selectSettlement} />
    <div style="flex: 1; min-width: 0;">
        {#if uiState().selectedClan}
            <h4 style="margin-top: 0">
                <EntityLink entity={uiState().selectedClan!.ref.settlement} />
                &gt; Clan {uiState().selectedClan!.name}
            </h4>
            <ClanDetails clan={uiState().selectedClan!} />
        {:else if uiState().selectedSettlement}
            <SettlementDecorated settlement={uiState().selectedSettlement!} />
        {:else if uiState().selectedCluster}
            <SettlementCluster cluster={uiState().selectedCluster!} />
        {:else}
            <Land world={worldState()} />
        {/if}
    </div>
    <aside class="right-rail">
        <Sidebar world={worldState()} />
        {#if !uiState().selectedClan && uiState().selectedSettlement}
            <SettlementRegionPanel
                settlement={uiState().selectedSettlement!}
                onSelect={selectSettlement}
            />
        {/if}
    </aside>
</div>

<style>
    /* Run controls on top, then whatever goes with the current view. Sticks
       at the body inset so the turn button stays in reach on long panels. */
    .right-rail {
        flex: 0 0 150px;
        position: sticky;
        top: 8px;
        align-self: flex-start;
        /* Above any panel too wide for its column, as the controls were when
           they floated over the folder. */
        z-index: 100;
        display: flex;
        flex-direction: column;
        gap: var(--clay-gap);
    }

    :global(body) {
        font-family: "PT Serif", Arial, sans-serif;
        background-color: #f9f6eb;
        color: #2c250d;
    }
</style>

