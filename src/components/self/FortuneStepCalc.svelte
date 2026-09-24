<script lang="ts">
    // Where one node of the Fortune tree came from, for the tooltip on that
    // node's figure. The panel shows the numbers; this shows the working
    // behind whichever one is being pointed at. An inner node shows its
    // children's values and what they combined to; a leaf shows its formula.
    import {
        EuNode,
        EudaimoniaReport,
        EU_BEER_MAX,
        EU_BEER_PER_SHARE,
        EU_CEREAL_IDEAL_SHARE,
        EU_QUALITY_AT_ALL_CEREAL,
        EU_QUALITY_AT_NO_CEREAL,
        EU_CONVERSATION_FLOOR,
        EU_CONVERSATION_NEUTRAL_AFFINITY,
        EU_CONVERSATION_PER_DOUBLING,
        EU_CONVERSATION_QUALITY_SCALE,
        EU_CONVERSATION_STANDARD,
        EU_FOOD_SCALE,
        EU_HONEY_PER_SHARE,
        FORTUNE_CHILDREN,
        combinerOf,
        euNodeDef,
        type EuNodeId,
    } from "../../model/self/eudaimonia";
    import {
        CARE_COMFORT_PER_DOUBLING,
        CARE_STRESS_KNOTS,
        careSkillFactor,
    } from "../../model/people/care";

    let {
        report,
        node,
        exponent,
    }: {
        report: EudaimoniaReport;
        node: EuNodeId;
        // Food quantity's curve differs between the subscore and the year.
        exponent: number;
    } = $props();

    const n = (x: number, p = 1) =>
        (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(p);
    const u = (x: number, p = 1) => x.toFixed(p);
    const pctOf = (x: number) => (x * 100).toFixed(0) + "%";

    let def = $derived(euNodeDef(node));
    let children = $derived(FORTUNE_CHILDREN.get(node));
    let combiner = $derived(combinerOf(node));
    let get = (id: EuNodeId) => report.get(id);
</script>

<div class="fs">
    <div class="head">{def.label}</div>

    {#if children}
        <!-- What went in and what came out; the row's note says how. -->
        <table class="parts">
            <tbody>
                {#each children as child (child)}
                    {@const v = get(child)}
                    <tr>
                        <td>{euNodeDef(child).label}</td>
                        <td class="v" class:pos={v > 0} class:neg={v < 0}
                            >{n(v)}</td
                        >
                    </tr>
                {/each}
                <tr class="result">
                    <td>{combiner.label}</td>
                    <td
                        class="v"
                        class:pos={get(node) > 0}
                        class:neg={get(node) < 0}>{n(get(node))}</td
                    >
                </tr>
            </tbody>
        </table>
    {:else if node === EuNode.FoodQuantity}
        <div class="line">
            {EU_FOOD_SCALE} &times; ({pctOf(get(EuNode.FoodRatio))}{#if exponent !== 1}<sup
                    >{exponent}</sup
                >{/if} &minus; 1) = <b>{n(get(EuNode.FoodQuantityRaw))}</b>
        </div>
        <div class="note">
            Held at zero from above: eating more than enough counts for
            nothing, so this can only ever be a debt.
        </div>
    {:else if node === EuNode.FoodQuality}
        {@const c = get(EuNode.CerealShare)}
        {@const high = c >= EU_CEREAL_IDEAL_SHARE}
        <div class="line">
            {high ? EU_QUALITY_AT_ALL_CEREAL : EU_QUALITY_AT_NO_CEREAL} &times;
            (({pctOf(c)} &minus; {pctOf(EU_CEREAL_IDEAL_SHARE)}) &divide;
            {pctOf(high ? 1 - EU_CEREAL_IDEAL_SHARE : EU_CEREAL_IDEAL_SHARE)})<sup
                >2</sup
            >
            = <b>{n(get(EuNode.FoodQuality))}</b>
        </div>
        <div class="note">
            A balanced diet is {pctOf(EU_CEREAL_IDEAL_SHARE)} cereals and costs
            nothing. All fish costs {EU_QUALITY_AT_NO_CEREAL}, all cereal
            {EU_QUALITY_AT_ALL_CEREAL}, rising as the square of the distance
            from the balance.
        </div>
    {:else if node === EuNode.Honey}
        <div class="line">
            {EU_HONEY_PER_SHARE} &times; {pctOf(get(EuNode.FishShare))} fish =
            <b>{n(get(EuNode.Honey))}</b>
        </div>
        <div class="note">
            Gatherers turn up honey and the like, worth a little in proportion
            to how much of the diet they provide.
        </div>
    {:else if node === EuNode.Beer}
        <div class="line">
            {EU_BEER_PER_SHARE} &times; {pctOf(get(EuNode.CerealShare))} cereals
            = {n(get(EuNode.BeerRaw))}
            {#if get(EuNode.BeerRaw) > EU_BEER_MAX}
                &rarr; <b>{n(EU_BEER_MAX)}</b> <span class="cap">(capped)</span>
            {/if}
        </div>
        <div class="note">
            Cereals make beer, worth rather more than honey, but only so much
            beer is any use &mdash; held at {EU_BEER_MAX}.
        </div>
    {:else if node === EuNode.CareComfort}
        <div class="line">
            {pctOf(get(EuNode.CareEffort))} effort &times; {pctOf(
                careSkillFactor(get(EuNode.CareSkillLevel)),
            )} at skill {u(get(EuNode.CareSkillLevel), 0)} =
            {pctOf(get(EuNode.CareProvision))} provided
        </div>
        <div class="line">
            {CARE_COMFORT_PER_DOUBLING} &times; log<sub>2</sub>({pctOf(
                get(EuNode.CareProvision),
            )}) = <b>{n(get(EuNode.CareComfort))}</b>
        </div>
        <div class="note">
            Each doubling of care provided is worth the same, so more care
            runs into diminishing returns.
        </div>
    {:else if node === EuNode.CareStress}
        <div class="line">
            {pctOf(get(EuNode.CareShare))} of the clan's effort to care =
            <b>{n(get(EuNode.CareStress))}</b>
        </div>
        <div class="note">
            {CARE_STRESS_KNOTS.map(
                ([s, v]) => `${pctOf(s)}: ${n(v, 0)}`,
            ).join(", ")}, straight between them.
        </div>
    {:else if node === EuNode.ConversationQuantity}
        <div class="line">
            {EU_CONVERSATION_PER_DOUBLING} &times; log<sub>2</sub>({u(
                get(EuNode.ConversationAmount),
                0,
            )} known &divide; {EU_CONVERSATION_STANDARD}) =
            <b>{n(get(EuNode.ConversationQuantity))}</b>
        </div>
        <div class="note">
            People outside the clan its people deal with regularly. Each
            doubling is worth the same, and knowing fewer than
            {u(EU_CONVERSATION_FLOOR)} counts as knowing that many.
        </div>
    {:else if node === EuNode.ConversationQuality}
        <div class="line">
            {EU_CONVERSATION_QUALITY_SCALE} &times; ({u(
                get(EuNode.ConversationAffinity),
                2,
            )} affinity &minus; {EU_CONVERSATION_NEUTRAL_AFFINITY}) =
            <b>{n(get(EuNode.ConversationQuality))}</b>
        </div>
        <div class="note">
            The clan's affinity for the clans it talks with, averaged by how
            many of each it knows.
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

    table.parts {
        border-collapse: collapse;
        font-size: 0.88em;
        font-variant-numeric: tabular-nums;
    }

    table.parts td {
        padding: 1px 0;
    }

    table.parts td.v {
        text-align: right;
        padding-left: 1.5rem;
    }

    tr.result td {
        border-top: 1px solid #e5e0d0;
        font-weight: 700;
    }

    .pos {
        color: #15803d;
    }

    .neg {
        color: #b91c1c;
    }

    .note {
        font-size: 0.78em;
        color: #6b7280;
        line-height: 1.35;
    }
</style>
