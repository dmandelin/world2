<script lang="ts">
    import { formatTellHeight, signed } from "../model/lib/format";
    import ButtonPanel from "./ButtonPanel.svelte";
    import Settlement from "./Settlement.svelte";
    import { SettlementDTO } from "./dtos";
    import { pct } from "../model/lib/format";
    import Tooltip from "./Tooltip.svelte";
    import DataTable from "./DataTable.svelte";

    let { settlement, onSelect } = $props();

    $effect(() => {
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
            <div class="sm">Flood level: {settlement.floodLevel.name}</div>
            <div class="sm">
                <Tooltip>
                    {#if settlement.ditchingLevel}
                        Ditch: {pct(settlement.ditchQuality)}
                        (holding {settlement.preventedForcedMigrations}x)
                    {:else}
                        No ditch
                    {/if}
                    <div slot="tooltip">
                        <DataTable rows={settlement.ditchTooltip} />
                    </div>
                </Tooltip>
            </div>
        </div>
        <div>
            <h4>{settlement.cluster.name} |
                <img src="stat-population-256.png" alt="Population" width="20" height="20"
                     style="padding-bottom: 2px;"
                />{settlement.cluster.population}&nbsp;
                <img src="stat-welfare-256.png" alt="Welfare" width="20" height="20"
                     style="padding-bottom: 4px;"
                />{signed(settlement.cluster.averageAppeal, 0)}
                <img src="stat-happiness-256.png" alt="Happiness" width="20" height="20"
                     style="padding-bottom: 4px;"
                />{signed(settlement.cluster.averageHappiness, 0)}</h4>
            <h1 style="white-space: nowrap;">{settlement.name} |
                <img src="stat-population-256.png" alt="Population" width="40" height="40"
                     style="padding-bottom: 4px;"
                />{settlement.population}&nbsp;
                <img src="stat-welfare-256.png" alt="Welfare" width="40" height="40"
                     style="padding-bottom: 8px;"
                />{signed(settlement.averageAppeal, 0)}
                <img src="stat-happiness-256.png" alt="Happiness" width="40" height="40"
                     style="padding-bottom: 8px;"
                />{signed(settlement.averageHappiness, 0)}</h1>
            <div>
                {pct(settlement.farmingRatio)} farming
            </div>
            <div>
                {pct(settlement.residenceFraction)} resident &centerdot;
                {#if settlement.yearsInPlace >= 100}
                    Settled &ndash; {formatTellHeight(settlement.tellHeightInMeters)}
                    <span style="color:grey">(founded {settlement.yearsInPlace} years ago)</span>
                {:else if settlement.yearsInPlace >= 50}
                    {settlement.yearsInPlace} years in place
                {:else if settlement.movingAverageForcedMigrations}
                    Shifting about every 
                    {(20/settlement.movingAverageForcedMigrations).toFixed()} years
                    ({settlement.movingAverageForcedMigrations.toFixed(1)}/20y)
                {/if}
            </div>

            <ButtonPanel config={{
        buttons: settlement.cluster.settlements.map((s: SettlementDTO) => 
        ({ label: `${s.name}<br>${s.population}`, data: s })),
    }} onSelected={(_, data) => { onSelect(data.uuid); } } />
        </div>
    </div>

    <Settlement settlement={settlement} />
</div>