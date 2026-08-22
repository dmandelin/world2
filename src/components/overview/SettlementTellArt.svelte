<script lang="ts">
    import { formatTellHeight, pct } from "../../model/lib/format";
    import { groupSedentismDescription } from "../../model/people/residence";
    import { formatYear } from "../../model/records/year";
    import type { SettlementDTO } from "../../model/records/dtos";
    import Tooltip from "../Tooltip.svelte";

    let { settlement }: { settlement: SettlementDTO } = $props();

    let residence = $derived(settlement.residenceFraction);
    let tier = $derived(groupSedentismDescription(residence));
    // 0-3, matching the four tiers groupSedentismDescription names.
    let tierIndex = $derived(Math.min(3, Math.floor(residence * 4)));

    let foundedYear = $derived(
        formatYear(settlement.world.yearValue - settlement.yearsInPlace),
    );

    // The tell rises out of accumulated debris, so drive the mound off the
    // actual tell height. Square root keeps early growth visible.
    let moundHeight = $derived(
        Math.min(14, Math.sqrt(Math.max(0, settlement.tellHeightInMeters)) * 11),
    );
    let tellMeasure = $derived(
        formatTellHeight(settlement.tellHeightInMeters).trim(),
    );
</script>

<div class="tell-art">
    <Tooltip>
        <svg viewBox="0 0 64 46" width="64" height="46" aria-hidden="true">
            <!-- ground -->
            <line
                x1="2"
                y1="40"
                x2="62"
                y2="40"
                stroke="#cbb98b"
                stroke-width="1.5"
            />
            <!-- the tell itself, growing with accumulated debris -->
            {#if moundHeight > 0.5}
                <path
                    d="M6 40 Q32 {40 - moundHeight * 2} 58 40 Z"
                    fill="#b89a63"
                />
            {/if}
            <!-- shelter for the current sedentism tier, atop the tell -->
            <g transform="translate(32, {40 - moundHeight})">
                {#if tierIndex === 0}
                    <!-- Harvest camp: a bare lean-to of sticks. -->
                    <g
                        stroke="#62531d"
                        stroke-width="1.5"
                        fill="none"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path d="M-9 0 L3 -10 L3 0" />
                        <path d="M-4 -4 L1 -4" />
                    </g>
                {:else if tierIndex === 1}
                    <!-- Farming camp: a light conical shelter. -->
                    <g stroke="#62531d" stroke-width="1.5" stroke-linejoin="round">
                        <path d="M-8 0 L0 -12 L8 0 Z" fill="#e6d7ab" />
                        <path
                            d="M-2 0 L-2 -4 L2 -4 L2 0"
                            fill="#8a7443"
                            stroke="none"
                        />
                    </g>
                {:else if tierIndex === 2}
                    <!-- Home camp: a round thatched hut. -->
                    <g stroke="#62531d" stroke-width="1.5" stroke-linejoin="round">
                        <path d="M-9 0 A9 9 0 0 1 9 0 Z" fill="#dcc890" />
                        <path
                            d="M-2 0 L-2 -5 L2 -5 L2 0"
                            fill="#8a7443"
                            stroke="none"
                        />
                    </g>
                {:else}
                    <!-- Settlement: mudbrick houses with flat roofs. -->
                    <g stroke="#62531d" stroke-width="1.5" stroke-linejoin="round">
                        <path d="M1 0 L1 -7 L10 -7 L10 0 Z" fill="#d3bd83" />
                        <path d="M-11 0 L-11 -11 L1 -11 L1 0 Z" fill="#e0cd97" />
                        <path d="M-12 -11 L2 -11" stroke-linecap="round" />
                        <path
                            d="M-7 0 L-7 -6 L-2 -6 L-2 0"
                            fill="#8a7443"
                            stroke="none"
                        />
                    </g>
                {/if}
            </g>
        </svg>
        <div slot="tooltip" class="tip">
            <div class="tip-head tip-line">
                {tier}
                <span class="tip-dim">&centerdot; {pct(residence)} resident</span>
            </div>
            {#if settlement.refoundedAfterRiverShift}
                <div class="tip-alert tip-line">Refounded after river shift!</div>
            {:else if residence > 0.5}
                <div class="tip-line">
                    Founded {foundedYear}
                    &centerdot; {settlement.yearsInPlace} years ago
                </div>
            {/if}
            <div class="tip-note">
                {pct(residence)} of clan time is spent in the settlement. Tiers
                change at 25 / 50 / 75%.
            </div>
        </div>
    </Tooltip>
    {#if tellMeasure}
        <div class="tell-caption">
            {tellMeasure}
            <Tooltip>
                <span class="term">tell</span>
                <div slot="tooltip" class="tip">
                    A mound raised by generations of mudbrick houses collapsing
                    and being rebuilt on the same spot. Its height records how
                    long people have lived here.
                </div>
            </Tooltip>
        </div>
    {/if}
</div>

<style>
    .tell-art {
        flex: 0 0 auto;
        width: 64px;
        /* The shelter sits low in the viewBox; lift it to sit level with the
           settlement name rather than trailing below it. */
        margin-top: -13px;
    }

    .tell-art svg {
        display: block;
    }

    .tell-caption {
        font-size: 0.62rem;
        line-height: 1.1;
        text-align: center;
        color: #8a7b4c;
        /* Close the gap left by the empty ground margin at the viewBox's foot. */
        margin-top: -5px;
    }

    /* No underline: the caption is small enough that a dotted rule under it
       reads as noise. The tooltip still works on hover. */


    /* The tooltip shell is nowrap; let longer explanations wrap. */
    .tip {
        white-space: normal;
        max-width: 24rem;
    }

    /* The headline facts stay on one line each; only the note below wraps. */
    .tip-line {
        white-space: nowrap;
    }

    .tip-head {
        font-size: 1rem;
    }

    .tip-dim {
        color: #8a7b4c;
    }

    .tip-alert {
        color: #a3401c;
        font-weight: bold;
    }

    .tip-note {
        margin-top: 0.4rem;
        padding-top: 0.35rem;
        border-top: 1px solid #ddd2ab;
        font-size: 0.85em;
        color: #6b5f3a;
    }
</style>
