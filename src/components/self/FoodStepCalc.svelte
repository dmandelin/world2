<script lang="ts">
    // Where one step of the food chain came from, for the tooltip on that
    // step's figure. The panel shows the numbers; this shows the working
    // behind whichever one is being pointed at.
    import {
        EuNode,
        EudaimoniaReport,
        EU_BEER_MAX,
        EU_BEER_PER_SHARE,
        EU_CEREAL_NUTRITION_PENALTY,
        EU_CEREAL_SHARE_FREE,
        EU_FOOD_SCALE,
        EU_HONEY_PER_SHARE,
        EU_TASTE_BOOST,
        EU_TASTE_BOOST_AT,
        EU_TASTE_FULL_AT,
        EU_TASTE_ZERO_AT,
        type EuNodeId,
    } from "../../model/self/eudaimonia";

    let {
        report,
        node,
        exponent,
    }: {
        report: EudaimoniaReport;
        node: EuNodeId;
        // Quantity's curve differs between Food and Fortune.
        exponent: number;
    } = $props();

    const n = (x: number, p = 1) =>
        (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(p);
    const u = (x: number, p = 1) => x.toFixed(p);
    const pctOf = (x: number) => (x * 100).toFixed(0) + "%";

    let scale = $derived(report.get(EuNode.TasteScale));
    let nutrition = $derived(report.get(EuNode.Nutrition));

    // Which steps are treats, and so get their worth decided by nutrition.
    let isTreat = $derived(
        node === EuNode.HoneyScaled || node === EuNode.BeerScaled,
    );
</script>

<div class="fs">
    {#if node === EuNode.Quantity}
        <div class="head">Quantity</div>
        <div class="line">
            {EU_FOOD_SCALE} &times; ({pctOf(report.get(EuNode.FoodRatio))}{#if exponent !== 1}<sup
                    >{exponent}</sup
                >{/if} &minus; 1) = <b>{n(report.get(EuNode.QuantityRaw))}</b>
        </div>
        <div class="note">
            Held at zero from above: eating more than enough counts for
            nothing, so this can only ever be a debt.
        </div>
    {:else if node === EuNode.Composition}
        <div class="head">Composition</div>
        {#if report.get(EuNode.CerealShare) > EU_CEREAL_SHARE_FREE}
            <div class="line">
                &minus;{EU_CEREAL_NUTRITION_PENALTY} &times; ({pctOf(
                    report.get(EuNode.CerealShare),
                )} cereals &minus; {pctOf(EU_CEREAL_SHARE_FREE)}) =
                <b>{n(report.get(EuNode.Composition))}</b>
            </div>
        {:else}
            <div class="line">
                Cereals are {pctOf(report.get(EuNode.CerealShare))} of the diet,
                within the {pctOf(EU_CEREAL_SHARE_FREE)} a mixed diet balances,
                so nothing is charged.
            </div>
        {/if}
        <div class="note">
            Fishing stands for hunting and gathering, which is varied and
            nourishing and carries no penalty at all. Farming stands for mixed
            production with goats and sheep, nourishing but less so, and past
            {pctOf(EU_CEREAL_SHARE_FREE)} of the diet the balance is lost.
        </div>
    {:else if node === EuNode.Nutrition}
        <div class="head">Nutrition</div>
        <div class="line">
            {n(report.get(EuNode.Quantity))} quantity {n(
                report.get(EuNode.Composition),
            )} composition = <b>{n(nutrition)}</b>
        </div>
        <div class="note">
            What the food was worth as nourishment, before anything it was
            worth as pleasure.
        </div>
    {:else if node === EuNode.HoneyScaled}
        <div class="head">Honey</div>
        <div class="line">
            {EU_HONEY_PER_SHARE} &times; {pctOf(report.get(EuNode.FishShare))} fish
            = {n(report.get(EuNode.Honey))}
        </div>
        <div class="line">
            &times; {u(scale, 2)} = <b>{n(report.get(EuNode.HoneyScaled))}</b>
        </div>
        <div class="note">
            Gatherers turn up honey and the like, worth a little in proportion
            to how much of the diet they provide.
        </div>
    {:else if node === EuNode.BeerScaled}
        <div class="head">Beer</div>
        <div class="line">
            {EU_BEER_PER_SHARE} &times; {pctOf(report.get(EuNode.CerealShare))} cereals
            = {n(EU_BEER_PER_SHARE * report.get(EuNode.CerealShare))}
            {#if EU_BEER_PER_SHARE * report.get(EuNode.CerealShare) > EU_BEER_MAX}
                &rarr; {n(EU_BEER_MAX)} <span class="cap">(capped)</span>
            {/if}
        </div>
        <div class="line">
            &times; {u(scale, 2)} = <b>{n(report.get(EuNode.BeerScaled))}</b>
        </div>
        <div class="note">
            Cereals make beer, worth rather more than honey, but only so much
            beer is any use &mdash; held at {EU_BEER_MAX} before scaling.
        </div>
    {:else if node === EuNode.Taste}
        <div class="head">Taste</div>
        <div class="line">
            ({n(report.get(EuNode.Honey))} honey {n(report.get(EuNode.Beer))} beer)
            &times; {u(scale, 2)} = <b>{n(report.get(EuNode.Taste))}</b>
        </div>
    {/if}

    {#if isTreat || node === EuNode.Taste}
        <!-- How nutrition decides what a treat is worth, which is the part
             that is easy to miss from the figures alone. -->
        <div class="scaling">
            <div class="scaling-head">
                Worth <b>{u(scale, 2)}</b> of face value at nutrition
                <b>{n(nutrition)}</b>
            </div>
            <div class="ramp">
                <div class="ramp-line"></div>
                <div
                    class="ramp-mark"
                    style="left: {Math.max(
                        0,
                        Math.min(
                            100,
                            ((nutrition - EU_TASTE_ZERO_AT) /
                                (EU_TASTE_BOOST_AT - EU_TASTE_ZERO_AT)) * 100,
                        ),
                    )}%"
                ></div>
            </div>
            <div class="ramp-labels">
                <span>{EU_TASTE_ZERO_AT}<br />nothing</span>
                <span class="mid">{EU_TASTE_FULL_AT}<br />full</span>
                <span>{EU_TASTE_BOOST_AT}<br />&times;{EU_TASTE_BOOST}</span>
            </div>
            <div class="note">
                A treat is worth nothing to the starving and a little more than
                its face value to the comfortable, so the bonuses are scaled by
                how the nutrition came out rather than simply added.
            </div>
        </div>
    {/if}
</div>

<style>
    .fs {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        min-width: 17rem;
        max-width: 23rem;
        color: #1f2328;
    }

    .head {
        font-weight: 700;
    }

    .line {
        font-size: 0.88em;
        font-variant-numeric: tabular-nums;
        line-height: 1.4;
    }

    .line b {
        font-weight: 700;
    }

    .cap {
        color: #9ca3af;
        font-size: 0.9em;
    }

    .note {
        font-size: 0.78em;
        color: #6b7280;
        line-height: 1.35;
    }

    .scaling {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        border-top: 1px solid #e5e0d0;
        padding-top: 0.4rem;
    }

    .scaling-head {
        font-size: 0.84em;
        font-variant-numeric: tabular-nums;
    }

    /* Where this clan's nutrition falls on the ramp that sets a treat's
       worth, so the number has somewhere to sit. */
    .ramp {
        position: relative;
        height: 0.7rem;
    }

    .ramp-line {
        position: absolute;
        top: 0.3rem;
        left: 0;
        right: 0;
        height: 3px;
        border-radius: 2px;
        background: linear-gradient(to right, #e5e0d0, #b7c6d8);
    }

    .ramp-mark {
        position: absolute;
        top: 0;
        width: 2px;
        height: 0.7rem;
        background: #1f2328;
        transform: translateX(-1px);
    }

    .ramp-labels {
        display: flex;
        justify-content: space-between;
        font-size: 0.68em;
        color: #9ca3af;
        text-align: center;
        line-height: 1.25;
        font-variant-numeric: tabular-nums;
    }

    .ramp-labels .mid {
        text-align: center;
    }
</style>
