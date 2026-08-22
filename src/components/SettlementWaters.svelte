<script lang="ts">
    import { pct } from "../model/lib/format";
    import type { SettlementDTO } from "../model/records/dtos";
    import { TwoDArrayTable } from "./tables/tables2";
    import TableView2 from "./tables/TableView2.svelte";
    import Tooltip from "./Tooltip.svelte";

    let { settlement }: { settlement: SettlementDTO } = $props();

    let ditchTooltipTable = $derived(
        new TwoDArrayTable(settlement.ditchTooltip),
    );
</script>

<div class="waters">
    <div class="facts">
        <div class="fact">
            <span class="k">Last flood level</span>
            <Tooltip>
                <span class="v">{settlement.floodLevel.name}</span>
                <div slot="tooltip">
                    River shift probability: {pct(
                        settlement.floodLevel.riverShiftProbability(),
                    )}
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

    h3 {
        margin: 0 0 0.4rem;
        font-size: 1rem;
        color: #62531d;
    }
</style>
