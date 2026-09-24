<script lang="ts">
    // Where one node of the Fortune tree came from, for the tooltip on that
    // node's figure. The panel shows the numbers; this shows the working
    // behind whichever one is being pointed at. A sum shows its children; a
    // leaf shows its formula.
    import {
        EuNode,
        EudaimoniaReport,
        EU_BEER_MAX,
        EU_BEER_PER_SHARE,
        EU_CEREAL_NUTRITION_PENALTY,
        EU_CEREAL_SHARE_FREE,
        EU_CONVERSATION_FLOOR,
        EU_CONVERSATION_NEUTRAL_AFFINITY,
        EU_CONVERSATION_PER_DOUBLING,
        EU_CONVERSATION_QUALITY_SCALE,
        EU_CONVERSATION_STANDARD,
        EU_FOOD_SCALE,
        EU_HONEY_PER_SHARE,
        FORTUNE_CHILDREN,
        euNodeDef,
        type EuNodeId,
    } from "../../model/self/eudaimonia";
    import {
        CHILDHOOD_JOY_SCALE,
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
    let get = (id: EuNodeId) => report.get(id);
</script>

<div class="fs">
    <div class="head">{def.label}</div>

    {#if children}
        <div class="line">
            {#each children as child, i (child)}
                {#if i > 0}{" "}{/if}{n(get(child))}
                <span class="cap">{euNodeDef(child).label.toLowerCase()}</span>
            {/each}
            = <b>{n(get(node))}</b>
        </div>
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
        {#if get(EuNode.CerealShare) > EU_CEREAL_SHARE_FREE}
            <div class="line">
                &minus;{EU_CEREAL_NUTRITION_PENALTY} &times; ({pctOf(
                    get(EuNode.CerealShare),
                )} cereals &minus; {pctOf(EU_CEREAL_SHARE_FREE)}) =
                <b>{n(get(EuNode.FoodQuality))}</b>
            </div>
        {:else}
            <div class="line">
                Cereals are {pctOf(get(EuNode.CerealShare))} of the diet,
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
    {:else if node === EuNode.CareQuantity}
        <div class="line">
            {CHILDHOOD_JOY_SCALE} &times; ({pctOf(get(EuNode.CareEffort))} effort
            &minus; 1) = <b>{n(get(EuNode.CareQuantity))}</b>
        </div>
        <div class="note">
            Care effort given, against the standard every clan owes its
            children.
        </div>
    {:else if node === EuNode.CareSkill}
        <div class="line">
            {CHILDHOOD_JOY_SCALE} &times; ({pctOf(
                careSkillFactor(get(EuNode.CareSkillLevel)),
            )} at skill {u(get(EuNode.CareSkillLevel), 0)} &minus; 1) =
            <b>{n(get(EuNode.CareSkill))}</b>
        </div>
        <div class="note">
            How much looking after the clan's skill got out of each unit of
            effort.
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

    {#if children}
        <div class="note">{def.note}</div>
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
</style>
