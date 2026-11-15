<script lang="ts">
    // A clan's part in this year's question of founding a new village.
    import type { ClanDTO } from "../../model/records/dtos";
    import { FOUNDING_REFERENCE_POPULATION } from "../../model/people/migration";
    import { signed } from "../../model/lib/format";
    import Tooltip from "../Tooltip.svelte";
    import FoundingAppealCalc from "../founding/FoundingAppealCalc.svelte";
    import FoundingWeightsCalc from "../founding/FoundingWeightsCalc.svelte";

    let { clan, compact = false }: { clan: ClanDTO; compact?: boolean } = $props();

    let vote = $derived(clan.foundingVote);

    let summary = $derived.by(() => {
        if (!vote) return "No question of founding a new village this year.";
        if (vote.goes) return "Going off to found a new village.";
        if (vote.prevented) return "Would have gone off to found a new village, but migration is turned off.";
        if (vote.final?.interested) return "Still interested at the end, but too few others were.";
        if (vote.everInterested) return "Showed an interest in founding a new village, but stays.";
        return "Not interested in founding a new village.";
    });
</script>

<div class="founding" class:compact>
    <p class="summary">{summary}</p>
    {#if vote}
        {#if !compact}
            <FoundingWeightsCalc {vote} />
        {/if}
        <table>
            <thead>
                <tr>
                    <th>Round</th>
                    <th class="n">People</th>
                    <th class="n">People part</th>
                    <th class="n">Favor part</th>
                    <th class="n">Alignment</th>
                    <th class="n">Alignment part</th>
                    <th class="n">Random</th>
                    <th class="n">Bonus</th>
                    <th class="n">Appeal</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                {#each vote.rounds as a (a.round)}
                    <tr class:interested={a.interested}>
                        <td>R{a.round}</td>
                        <td class="n">{a.expectedPopulation.toFixed(0)}</td>
                        <td class="n">{signed(a.populationTerm, 1)}</td>
                        <td class="n">{signed(a.favorTerm, 1)}</td>
                        <td class="n">{signed(a.alignment, 2)} <span class="dim">{a.alignmentBasis}</span></td>
                        <td class="n">{signed(a.alignmentTerm, 1)}</td>
                        <td class="n">{signed(a.random, 1)}</td>
                        <td class="n">{signed(a.bonus, 1)}</td>
                        <td class="n strong">
                            {#if compact}
                                {signed(a.value, 1)}
                            {:else}
                                <Tooltip>
                                    {signed(a.value, 1)}
                                    <div slot="tooltip"><FoundingAppealCalc {vote} appeal={a} /></div>
                                </Tooltip>
                            {/if}
                        </td>
                        <td class="dim">
                            {a.interested ? "interested" : a.crowdedOut ? "crowded out" : ""}
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
        {#if !compact}
            <p class="note">
                People part is its weight × ln(people / {FOUNDING_REFERENCE_POPULATION}). Favor part is
                its weight × the change from its Favor now ({signed(vote.favor, 1)}) to 0.
            </p>
        {/if}
    {/if}
</div>

<style>
    .founding {
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
        font-size: 0.85rem;
        color: #2c1e05;
    }

    .founding.compact {
        gap: 0.3rem;
        font-size: 0.78rem;
    }

    .summary {
        margin: 0;
        font-weight: 600;
        color: #62531d;
    }

    table {
        border-collapse: collapse;
    }

    th {
        font-weight: 600;
        color: #6b5f3a;
        border-bottom: 1px solid #c4b98a;
        padding: 0.1rem 0.4rem;
        text-align: left;
    }

    td {
        padding: 0.1rem 0.4rem;
        border-bottom: 1px dotted #ded3ae;
    }

    .n {
        text-align: right;
        font-variant-numeric: tabular-nums;
    }

    tr.interested td {
        background-color: #e3f0df;
    }

    .strong {
        font-weight: 600;
    }

    .dim {
        color: #8a7f60;
        font-size: 0.9em;
    }

    .note {
        margin: 0;
        max-width: 36rem;
        color: #6b5f3a;
    }
</style>
