<script lang="ts">
    // How a clan's nutrition was worked out, for the tooltip on the overview's
    // Nutrition row. Recomputed from the clan's consumption with the same
    // functions the model uses, so the two cannot disagree.
    import type { ClanDTO } from "../../model/records/dtos";
    import {
        BALANCE_AT_ALL_CEREAL,
        BALANCE_AT_NO_CEREAL,
        NUTRITION_IDEAL_CEREAL_SHARE,
        NUTRITION_MAX,
        foodBalance,
        nutritionFromRaw,
        rawNutrition,
    } from "../../model/people/nutrition";

    let { clan }: { clan: ClanDTO } = $props();

    let rations = $derived(clan.consumption?.perCapitaFood ?? 0);
    let cereal = $derived(1 - (clan.consumption?.fishRatio ?? 0.5));
    let balance = $derived(foodBalance(cereal));
    let raw = $derived(rawNutrition(rations, cereal));
    let nutrition = $derived(nutritionFromRaw(raw));

    const pctOf = (x: number) => (x * 100).toFixed(0) + "%";
</script>

<div class="nc">
    <div class="head">Nutrition</div>

    <table>
        <tbody>
            <tr>
                <td>Rations</td>
                <td class="v">{pctOf(rations)}</td>
                <td class="note">food eaten against needs</td>
            </tr>
            <tr>
                <td>&times; Balance</td>
                <td class="v">{pctOf(balance)}</td>
                <td class="note">at {pctOf(cereal)} cereals</td>
            </tr>
            <tr class="sub">
                <td>= Before ceiling</td>
                <td class="v">{pctOf(raw)}</td>
                <td class="note"></td>
            </tr>
            <tr class="total">
                <td>Nutrition</td>
                <td class="v">{pctOf(nutrition)}</td>
                <td class="note">
                    {#if raw > 1}
                        diminishing toward {pctOf(NUTRITION_MAX)}
                    {:else}
                        as is, below 100%
                    {/if}
                </td>
            </tr>
        </tbody>
    </table>

    <div class="foot">
        Balance is 100% at {pctOf(NUTRITION_IDEAL_CEREAL_SHARE)} cereals, falling
        as the square of the distance to {pctOf(BALANCE_AT_NO_CEREAL)} at all
        fish and {pctOf(BALANCE_AT_ALL_CEREAL)} at all cereal. Past 100%, the
        excess runs toward a ceiling of {pctOf(NUTRITION_MAX)}.
    </div>
</div>

<style>
    .nc {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        min-width: 17rem;
        max-width: 24rem;
        color: #1f2328;
        text-align: left;
    }

    .head {
        font-weight: 700;
    }

    table {
        border-collapse: collapse;
        font-size: 0.88em;
        font-variant-numeric: tabular-nums;
    }

    td {
        padding: 1px 0;
    }

    td.v {
        text-align: right;
        padding: 1px 0.8rem;
    }

    td.note {
        color: #9ca3af;
        font-size: 0.9em;
    }

    tr.sub td {
        border-top: 1px solid #e5e0d0;
    }

    tr.total td {
        border-top: 1px solid #ddd6c0;
        font-weight: 700;
    }

    tr.total td.note {
        font-weight: 400;
    }

    .foot {
        font-size: 0.78em;
        color: #6b7280;
        line-height: 1.35;
    }
</style>
