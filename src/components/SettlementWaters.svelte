<script lang="ts">
    import { pct } from "../model/lib/format";
    import type { SettlementDTO } from "../model/records/dtos";
    import { TwoDArrayTable } from "./tables/tables2";
    import TableView2 from "./tables/TableView2.svelte";
    import Tooltip from "./Tooltip.svelte";
    import FloodPictogram from "./widgets/FloodPictogram.svelte";

    let { settlement }: { settlement: SettlementDTO } = $props();

    let ditchTooltipTable = $derived(
        new TwoDArrayTable(settlement.ditchTooltip),
    );
</script>

<div class="waters">
    <div class="facts">
        <div class="fact">
            <span class="k">This year's flood</span>
            <span class="v flood-value">
                <FloodPictogram
                    floodLevel={settlement.floodLevel}
                    width={48}
                    caption={false}
                />
                {settlement.floodLevel.name}
            </span>
        </div>
        <div class="fact">
            <span class="k">Across the region</span>
            <span class="v">{settlement.cluster.floodLevel.name}</span>
        </div>
        <div class="fact">
            <span class="k">River shift</span>
            <Tooltip>
                <span class="v"
                    >{pct(settlement.floodLevel.riverShiftProbability(), 1)}</span
                >
                <div slot="tooltip">
                    Chance per year that the river moves and the settlement
                    has to be refounded.
                </div>
            </Tooltip>
        </div>
        <div class="fact">
            <span class="k">Ditch</span>
            <span class="v">
                {#if settlement.ditchingLevel}
                    {pct(settlement.ditchQuality)}
                {:else}
                    None
                {/if}
            </span>
        </div>
    </div>

    {#if settlement.ditchingLevel}
        <h3>Ditch Maintenance</h3>
        <TableView2 table={ditchTooltipTable} />
    {/if}
</div>

<style>
    .facts {
        display: flex;
        gap: 2rem;
        margin-bottom: 1rem;
    }

    .fact {
        display: flex;
        flex-direction: column;
    }

    .k {
        font-variant: small-caps;
        letter-spacing: 0.03em;
        font-size: 0.78rem;
        color: #4b7f95;
    }

    .v {
        font-size: 1.1rem;
    }

    .flood-value {
        display: flex;
        align-items: center;
        gap: 0.4rem;
    }

    h3 {
        margin: 0 0 0.4rem;
        font-size: 1rem;
        color: #62531d;
    }
</style>
