<script lang="ts">
    import { pct } from "../../model/lib/format";
    import type { SettlementDTO } from "../../model/records/dtos";
    import Tooltip from "../Tooltip.svelte";

    let {
        settlement,
        width = 64,
    }: {
        settlement: SettlementDTO;
        width?: number;
    } = $props();

    let ditch = $derived(settlement.ditch);
    let rating = $derived(settlement.ditchRating);
    let floodRating = $derived(settlement.floodRating);
    let holds = $derived(settlement.ditchHolds);

    // One scale for both bars, with room above whichever runs higher.
    let scale = $derived(Math.max(100, rating, floodRating) * 1.05);
    let ratingFrac = $derived(Math.min(1, rating / scale));
    let floodFrac = $derived(Math.min(1, floodRating / scale));

    let depthCredit = $derived(ditch?.depthCreditAgainst(floodRating) ?? 0);
    let effect = $derived(settlement.ditchEffect);
    let yields = $derived(settlement.floodLevel.agricultureOn("alluvium"));
</script>

<Tooltip>
    <span class="gauge" style="width: {width}px;">
        <span class="bar">
            <!-- how deep and sound the ditches are -->
            <span
                class="fill"
                class:holds
                style="width: {pct(ratingFrac)};"
            ></span>
            <!-- how hard the water pushes -->
            <span class="flood-mark" style="left: {pct(floodFrac)};"></span>
        </span>
        <span class="caption" class:holds>
            {rating.toFixed(0)} <span class="vs">vs</span>
            {floodRating.toFixed(0)}
        </span>
    </span>

    <div slot="tooltip" class="tip">
        {#if !ditch?.building}
            <div class="tip-head">No ditches</div>
            <div class="tip-line">
                Nobody worked on them this year, so the fields take the water
                as it comes.
            </div>
        {:else}
            <div class="tip-head" class:held={holds}>
                {holds
                    ? "The ditches are built for all of this year's water"
                    : `The ditches are built for ${pct(depthCredit)} of this year's water`}
            </div>
            <div class="tip-line">
                Ditch rating {rating.toFixed(0)} against water pushing at {floodRating.toFixed(
                    0,
                )}
                &centerdot; {settlement.ditchingMethod.name}
            </div>
            <div class="tip-note">
                <div>
                    {ditch.rawEffort.toFixed(1)} worker-turns ({pct(ditch.effortShare)}
                    of everyone's year), worth {ditch.effort.toFixed(1)} at digging,
                    around {ditch.land.toFixed(0)} of land; a full ditch here would
                    take {ditch.requiredEffort.toFixed(1)}
                </div>
                <div>
                    Digging alone rates {ditch.baseRating.toFixed(0)}{#if ditch.coordinationPenalty > 0}, less
                        {ditch.coordinationPenalty.toFixed(0)} for the
                        {ditch.uncoordinatedEffort.toFixed(1)} worker-turns beyond
                        what {settlement.ditchingMethod.name} can hold together{/if}
                    &centerdot; crews of skill {ditch.skill.toFixed(0)}
                </div>
                <div>
                    This year the ditches are worth {pct(effect)} of a full one,
                    taking the harvest from {pct(yields.unditched)} to {pct(
                        yields.at(effect),
                    )} of normal
                </div>
            </div>
        {/if}
    </div>
</Tooltip>

<style>
    .gauge {
        display: inline-flex;
        flex-direction: column;
        align-items: stretch;
        gap: 0.1rem;
    }

    .bar {
        position: relative;
        display: block;
        height: 7px;
        border: 1px solid #cbb98b;
        border-radius: 3px;
        background: #f3edd8;
        overflow: hidden;
    }

    .fill {
        display: block;
        height: 100%;
        background: #c05621;
    }

    /* A ditch ahead of the water reads as sound rather than as a warning. */
    .fill.holds {
        background: #4a7fa5;
    }

    /* Where the water stands: the line the ditch has to beat. */
    .flood-mark {
        position: absolute;
        top: -1px;
        bottom: -1px;
        width: 2px;
        margin-left: -1px;
        background: #62531d;
    }

    .caption {
        font-size: 0.6rem;
        line-height: 1.1;
        text-align: center;
        color: #a3401c;
    }

    .caption.holds {
        color: #4b7f95;
    }

    .vs {
        color: #8a7b4c;
    }

    /* The tooltip shell is nowrap; let the detail wrap. */
    .tip {
        white-space: normal;
        width: max-content;
        max-width: 46rem;
    }

    .tip-head {
        font-size: 1rem;
        font-weight: bold;
        color: #a3401c;
    }

    .tip-head.held {
        color: #4b7f95;
    }

    .tip-line {
        margin-top: 0.1rem;
    }

    .tip-note {
        margin-top: 0.4rem;
        padding-top: 0.35rem;
        border-top: 1px solid #ddd2ab;
        font-size: 0.85em;
        color: #6b5f3a;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }
</style>
