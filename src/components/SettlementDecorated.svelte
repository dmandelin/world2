<script lang="ts">
    import { formatTellHeight, pct } from "../model/lib/format";
    import { SettlementDTO } from "../model/records/dtos";
    import {
        groupSedentismDescription,
        groupSedentismImage,
    } from "../model/people/residence";
    import { TwoDArrayTable } from "./tables/tables2";
    import TableView2 from "./tables/TableView2.svelte";
    import Settlement from "./Settlement.svelte";
    import Tooltip from "./Tooltip.svelte";
    import EntityLink from "./state/EntityLink.svelte";

    let {
        settlement,
        onSelect,
    }: { settlement: SettlementDTO; onSelect: (uuid: string) => void } =
        $props();

    let ditchTooltipTable = $derived(
        new TwoDArrayTable(settlement.ditchTooltip),
    );
</script>

<div id="top">
    <div class="header-row">
        <div>
            <img
                style="display: block"
                src={groupSedentismImage(settlement.residenceFraction)}
                alt="Residents"
                width="150"
                height="100"
            />
            <div class="sm">
                Last flood level:
                <Tooltip>
                    {settlement.floodLevel.name}
                    <div slot="tooltip">
                        River shift probability: {pct(
                            settlement.floodLevel.riverShiftProbability(),
                        )}
                    </div>
                </Tooltip>
            </div>
            <div class="sm">
                <Tooltip>
                    {#if settlement.ditchingLevel}
                        Ditch: {pct(settlement.ditchQuality)}
                    {:else}
                        No ditch
                    {/if}
                    <div slot="tooltip">
                        <TableView2 table={ditchTooltipTable} />
                    </div>
                </Tooltip>
            </div>
        </div>
        <div class="main-col">
            <h1 style="white-space: nowrap;">
            {settlement.name} |
            <img
                src="stat-population-256.png"
                alt="Population"
                width="40"
                height="40"
                style="padding-bottom: 4px;"
            />{settlement.population}
            </h1>
            <div>
                {groupSedentismDescription(settlement.residenceFraction)}
                ({pct(settlement.residenceFraction)} resident) &centerdot;
                {#if settlement.refoundedAfterRiverShift}
                    <b>Refounded after river shift!</b>
                {:else if settlement.residenceFraction > 0.5}
                    {#if settlement.yearsInPlace >= 100}
                        Settled &ndash; {formatTellHeight(
                            settlement.tellHeightInMeters,
                        )}
                        <span style="color:grey"
                            >(founded {settlement.yearsInPlace} years ago)</span
                        >
                    {:else if settlement.yearsInPlace >= 20}
                        {settlement.yearsInPlace} years in place
                    {:else}
                        New settlement
                    {/if}
                {:else}
                    Mobile communities
                {/if}
            </div>
            <div>
                {pct(settlement.farmingRatio)} farming
            </div>
        </div>
        <div class="region-panel">
            <div class="cluster-info">
                <EntityLink entity={settlement.cluster} /> Region ·
                <img
                    src="stat-population-256.png"
                    alt="Population"
                    width="16"
                    height="16"
                    style="padding-bottom: 2px;"
                />{settlement.cluster.population}
            </div>
            <div class="settlement-buttons">
                {#each settlement.cluster.settlements as s (s.uuid)}
                    <button
                        type="button"
                        class:active={s.uuid === settlement.uuid}
                        onclick={() => onSelect(s.uuid)}
                    >
                        <span class="settlement-name">{s.name}</span>
                        <span class="pop">{s.population}</span>
                    </button>
                {/each}
            </div>
        </div>
    </div>

    <Settlement {settlement} />
</div>

<style>
    #top {
        margin-left: 1rem;
    }

    h1 {
        margin: 0;
    }

    .header-row {
        display: flex;
        gap: 1rem;
        margin-top: 0.25rem;
        align-items: flex-start;
    }

    .main-col {
        flex: 1;
        min-width: 0;
    }

    .region-panel {
        flex: 0 0 auto;
        width: 230px;
        margin-right: 220px;
        padding: 0.5rem 0.5rem;
        background-color: #f3edd8;
        border: 1px solid #cbb98b;
        border-radius: 8px;
    }

    .cluster-info {
        font-variant: small-caps;
        letter-spacing: 0.03em;
        font-weight: bold;
        color: #5a4d20;
        margin-bottom: 0.5rem;
    }

    .settlement-buttons {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 0.3rem;
        max-height: calc(2 * 2.2rem + 0.3rem);
        overflow-y: auto;
    }

    .settlement-buttons button {
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
        min-width: 0;
        height: 2.2rem;
        padding: 0.15rem 0.15rem;
        border: 1px solid #b8a86a;
        border-radius: 5px;
        background-color: #fffaf0;
        color: #2c250d;
        font-size: 0.7rem;
        line-height: 1.15;
        text-align: center;
        cursor: pointer;
        overflow: hidden;
    }

    .settlement-buttons button:hover {
        background-color: #fff2d6;
    }

    .settlement-buttons button.active {
        background-color: #e8d9a8;
        border-color: #62531d;
        font-weight: bold;
    }

    .settlement-buttons .settlement-name {
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .settlement-buttons .pop {
        font-size: 0.6rem;
        font-weight: normal;
        color: dimgray;
    }

    img {
        vertical-align: middle;
    }

    .sm {
        font-size: smaller;
    }
</style>
