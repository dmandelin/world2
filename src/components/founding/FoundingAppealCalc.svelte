<script lang="ts">
    // How one clan's appeal of founding a new village came out in one round.
    import {
        FOUNDING_BASE,
        FOUNDING_REFERENCE_POPULATION,
        type FoundingAppeal,
        type FoundingVote,
    } from "../../model/people/migration";
    import { signed } from "../../model/lib/format";

    let { vote, appeal }: { vote: FoundingVote; appeal: FoundingAppeal } = $props();

    let w = $derived(vote.weights);
</script>

<div class="calc">
    <div class="head">{vote.clanName}, round {appeal.round}</div>
    <table>
        <tbody>
            <tr><td>Base</td><td class="dim"></td><td class="n">{signed(FOUNDING_BASE, 1)}</td></tr>
            <tr>
                <td>People</td>
                <td class="dim">
                    {w.population.toFixed(2)} × ln({appeal.expectedPopulation.toFixed(0)} / {FOUNDING_REFERENCE_POPULATION})
                </td>
                <td class="n">{signed(appeal.populationTerm, 1)}</td>
            </tr>
            <tr>
                <td>Favor</td>
                <td class="dim">{w.favor.toFixed(2)} × {signed(appeal.favorChange, 1)}</td>
                <td class="n">{signed(appeal.favorTerm, 1)}</td>
            </tr>
            <tr>
                <td>Alignment</td>
                <td class="dim">{w.alignment.toFixed(2)} × {signed(appeal.alignment, 2)}</td>
                <td class="n">{signed(appeal.alignmentTerm, 1)}</td>
            </tr>
            <tr>
                <td>Random</td>
                <td class="dim">({signed(vote.roll, 0)} roll)</td>
                <td class="n">{signed(appeal.random, 1)}</td>
            </tr>
            <tr><td>Round bonus</td><td class="dim"></td><td class="n">{signed(appeal.bonus, 1)}</td></tr>
            <tr class="total">
                <td colspan="2">Appeal</td>
                <td class="n">{signed(appeal.value, 1)}</td>
            </tr>
        </tbody>
    </table>
    <p class="note">
        {#if appeal.round === 0}
            Supposes a third of the village would go: {appeal.expectedPopulation.toFixed(0)} people.
            Alignment is its average toward the whole village.
        {:else}
            Supposes those interested last round would go, with itself:
            {appeal.expectedPopulation.toFixed(0)} people. Alignment is its average toward them.
        {/if}
        Favor change is from its Favor now ({signed(vote.favor, 1)}) to a fresh start at 0.
    </p>
    <p class="note">
        {#if appeal.interested}
            Above 0 and among the keenest: interested.
        {:else if appeal.crowdedOut}
            Above 0, but too many clans were keener.
        {:else}
            Not above 0: not interested.
        {/if}
    </p>
</div>

<style>
    .calc {
        font-size: 0.8rem;
        color: #2c1e05;
    }

    .head {
        font-weight: 600;
        color: #62531d;
        margin-bottom: 0.25rem;
    }

    table {
        border-collapse: collapse;
        font-size: 1em;
    }

    td {
        padding: 0.05rem 0.4rem 0.05rem 0;
        border: none;
        vertical-align: baseline;
    }

    .n {
        text-align: right;
        font-variant-numeric: tabular-nums;
        padding-left: 0.8rem;
    }

    tr.total td {
        border-top: 1px solid #c4b98a;
        font-weight: 600;
    }

    .dim {
        color: #8a7f60;
    }

    .note {
        margin: 0.35rem 0 0;
        max-width: 22rem;
        white-space: normal;
        color: #6b5f3a;
    }
</style>
