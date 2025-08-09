<script lang="ts">
    import { signed } from "../model/lib/format";
    import ButtonPanel from "./ButtonPanel.svelte";
    import Settlement from "./Settlement.svelte";
    import { SettlementDTO } from "./dtos";
    import { pct } from "../model/lib/format";
    import Tooltip from "./Tooltip.svelte";
    import DataTable from "./DataTable.svelte";

    let { settlement } = $props();
    let selectedSettlement = $state(settlement);
    $effect(() => {
        selectedSettlement = settlement;
    });
</script>

<style>
    #top {
        margin-left: 1rem;
    }

    h1 {
        margin: 0;
    }

    h4 {
        margin: 0;
    }

    img {
        vertical-align: middle;
    }

    .sm {
        font-size: smaller;
    }
</style>

<div id="top">
    <div style="display: flex; gap: 1rem; margin-top: 0.25rem">
        <div>
            <img style="display: block" src="residents.png" alt="Residents" width="150" height="100" />
            <div class="sm">Flood level: {selectedSettlement.floodLevel.name}</div>
            <div class="sm">
                <Tooltip>
                    {#if selectedSettlement.ditchingLevel}
                        Ditch: {pct(selectedSettlement.ditchQuality)}
                    {:else}
                        No ditch
                    {/if}
                    <div slot="tooltip">
                        <DataTable rows={selectedSettlement.ditchTooltip} />
                    </div>
                </Tooltip>
            </div>
        </div>
        <div>
            <h4>{selectedSettlement.cluster.name} |
                <img src="stat-population-256.png" alt="Population" width="20" height="20"
                     style="padding-bottom: 2px;"
                />{selectedSettlement.cluster.population}&nbsp;
                <img src="stat-qol-256.png" alt="QoL" width="20" height="20"
                     style="padding-bottom: 4px;"
                />{signed(selectedSettlement.cluster.averageQoL, 0)}</h4>
            <h1 style="white-space: nowrap;">{selectedSettlement.name} |
                <img src="stat-population-256.png" alt="Population" width="40" height="40"
                     style="padding-bottom: 4px;"
                />{selectedSettlement.size}&nbsp;
                <img src="stat-qol-256.png" alt="QoL" width="40" height="40"
                     style="padding-bottom: 8px;"
                />{signed(selectedSettlement.averageQoL, 0)}</h1>
            <div>
                {#if selectedSettlement.forcedMigrations}
                  Shifting about every {(20/selectedSettlement.forcedMigrations).toFixed()} years ({selectedSettlement.forcedMigrations}/20y)
                {/if}
            </div>

            <ButtonPanel config={{
        buttons: settlement.cluster.settlements.map((s: SettlementDTO) => 
        ({ label: `${s.name}<br>${s.population}`, data: s })),
    }} onSelected={(_, data) => { selectedSettlement = data; } } />
        </div>
    </div>

    <Settlement settlement={selectedSettlement} />
</div>