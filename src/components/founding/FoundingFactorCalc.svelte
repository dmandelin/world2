<script lang="ts">
    // How one part of a clan's appeal of founding a new village was worked
    // out in one round, with the traits that went into it.
    import {
        FOUNDING_ALIGNMENT_COEFFICIENT,
        FOUNDING_BASE,
        FOUNDING_FAVOR_COEFFICIENT,
        FOUNDING_INTELLECT_POPULATION,
        FOUNDING_INTELLECT_RANDOM,
        FOUNDING_PEACEABLENESS_FAVOR,
        FOUNDING_POPULATION_COEFFICIENT,
        FOUNDING_RANDOM_SCALE,
        FOUNDING_REFERENCE_POPULATION,
        FOUNDING_ROUND_BONUS,
        FOUNDING_ROUND_BONUS_DECAY,
        FOUNDING_ROUNDS,
        FOUNDING_SOCIABILITY_POPULATION,
        FOUNDING_TENDERNESS_ALIGNMENT,
        FOUNDING_TENDERNESS_FAVOR,
        type FoundingAppeal,
        type FoundingVote,
    } from "../../model/people/migration";
    import { TRAIT_SD } from "../../model/people/traits";
    import { signed } from "../../model/lib/format";

    type FoundingFactor = "base" | "people" | "favor" | "alignment" | "random" | "bonus";

    let {
        vote,
        appeal,
        factor,
    }: { vote: FoundingVote; appeal: FoundingAppeal; factor: FoundingFactor } = $props();

    let w = $derived(vote.weights);
    const f = (perSD: number, trait: number) => Math.pow(perSD, (trait - 50) / TRAIT_SD);
    const x = (v: number) => "×" + v.toFixed(2);
    // How each trait moves things, per TRAIT_SD points above 50.
    const per = (perSD: number) => `${x(perSD)} per ${TRAIT_SD} above 50`;

    const titles: Record<FoundingFactor, string> = {
        base: "Base",
        people: "People",
        favor: "Favor",
        alignment: "Alignment",
        random: "Random",
        bonus: "Round bonus",
    };
</script>

<div class="calc">
    <div class="head">{vote.clanName}: {titles[factor]}, round {appeal.round}</div>
    {#if factor === "base"}
        <p class="note">
            The same for every clan: where leaving starts from before anything else is counted,
            {signed(FOUNDING_BASE, 1)}.
        </p>
    {:else if factor === "people"}
        <table>
            <tbody>
                <tr><td>Base weight</td><td class="dim"></td><td class="n">{FOUNDING_POPULATION_COEFFICIENT.toFixed(2)}</td></tr>
                <tr>
                    <td>Intellect {w.intellect}</td>
                    <td class="dim">{per(FOUNDING_INTELLECT_POPULATION)}</td>
                    <td class="n">{x(f(FOUNDING_INTELLECT_POPULATION, w.intellect))}</td>
                </tr>
                <tr>
                    <td>Sociability {w.sociability}</td>
                    <td class="dim">{per(FOUNDING_SOCIABILITY_POPULATION)}</td>
                    <td class="n">{x(f(FOUNDING_SOCIABILITY_POPULATION, w.sociability))}</td>
                </tr>
                <tr class="total"><td colspan="2">Weight</td><td class="n">{w.population.toFixed(2)}</td></tr>
                <tr>
                    <td>× ln(people / {FOUNDING_REFERENCE_POPULATION})</td>
                    <td class="dim">ln({appeal.expectedPopulation.toFixed(0)} / {FOUNDING_REFERENCE_POPULATION})</td>
                    <td class="n">{signed(Math.log(Math.max(1, appeal.expectedPopulation) / FOUNDING_REFERENCE_POPULATION), 2)}</td>
                </tr>
                <tr class="total"><td colspan="2">People</td><td class="n">{signed(appeal.populationTerm, 1)}</td></tr>
            </tbody>
        </table>
        <p class="note">
            {#if appeal.round === 0}
                In the first round a clan supposes a third of the village would go.
            {:else}
                The people interested last round, with itself.
            {/if}
            Sociable clans care more how many come along; clever ones less.
        </p>
    {:else if factor === "favor"}
        <table>
            <tbody>
                <tr><td>Base weight</td><td class="dim"></td><td class="n">{FOUNDING_FAVOR_COEFFICIENT.toFixed(2)}</td></tr>
                <tr>
                    <td>Tenderness {w.tenderness}</td>
                    <td class="dim">{per(FOUNDING_TENDERNESS_FAVOR)}</td>
                    <td class="n">{x(f(FOUNDING_TENDERNESS_FAVOR, w.tenderness))}</td>
                </tr>
                <tr>
                    <td>Peaceableness {w.peaceableness}</td>
                    <td class="dim">{per(FOUNDING_PEACEABLENESS_FAVOR)}</td>
                    <td class="n">{x(f(FOUNDING_PEACEABLENESS_FAVOR, w.peaceableness))}</td>
                </tr>
                <tr class="total"><td colspan="2">Weight</td><td class="n">{w.favor.toFixed(2)}</td></tr>
                <tr>
                    <td>× change in Favor</td>
                    <td class="dim">from {signed(vote.favor, 1)} to 0</td>
                    <td class="n">{signed(appeal.favorChange, 1)}</td>
                </tr>
                <tr class="total"><td colspan="2">Favor</td><td class="n">{signed(appeal.favorTerm, 1)}</td></tr>
            </tbody>
        </table>
        <p class="note">
            Leaving leaves the old village's decisions behind, good and bad. Tender clans care more what
            those are doing to their people; peaceable ones are readier to put up with them.
        </p>
    {:else if factor === "alignment"}
        <table>
            <tbody>
                <tr><td>Base weight</td><td class="dim"></td><td class="n">{FOUNDING_ALIGNMENT_COEFFICIENT.toFixed(2)}</td></tr>
                <tr>
                    <td>Tenderness {w.tenderness}</td>
                    <td class="dim">{per(FOUNDING_TENDERNESS_ALIGNMENT)}</td>
                    <td class="n">{x(f(FOUNDING_TENDERNESS_ALIGNMENT, w.tenderness))}</td>
                </tr>
                <tr class="total"><td colspan="2">Weight</td><td class="n">{w.alignment.toFixed(2)}</td></tr>
                <tr>
                    <td>× average alignment</td>
                    <td class="dim">toward {appeal.alignmentBasis === "village" ? "the whole village" : "those interested last round"}</td>
                    <td class="n">{signed(appeal.alignment, 2)}</td>
                </tr>
                <tr class="total"><td colspan="2">Alignment</td><td class="n">{signed(appeal.alignmentTerm, 1)}</td></tr>
            </tbody>
        </table>
        <p class="note">
            Weighted by people, over the other clans. Tender clans care more who they would be going with.
            {#if appeal.alignmentBasis === "interested" && appeal.alignment === 0}
                Nobody else was interested last round, so there is nobody to get on with.
            {/if}
        </p>
    {:else if factor === "random"}
        <table>
            <tbody>
                <tr><td>Roll (d6 − d6)</td><td class="dim">once a year</td><td class="n">{signed(vote.roll, 0)}</td></tr>
                <tr><td>× scale</td><td class="dim"></td><td class="n">{FOUNDING_RANDOM_SCALE.toFixed(2)}</td></tr>
                <tr>
                    <td>Intellect {w.intellect}</td>
                    <td class="dim">{per(FOUNDING_INTELLECT_RANDOM)}</td>
                    <td class="n">{x(w.randomFactor)}</td>
                </tr>
                <tr class="total"><td colspan="2">Random</td><td class="n">{signed(appeal.random, 1)}</td></tr>
            </tbody>
        </table>
        <p class="note">The same in every round of the year. Clever clans are swayed less by whim.</p>
    {:else}
        <p class="note">
            {#if appeal.round >= FOUNDING_ROUNDS - 1}
                The last round has no bonus: what is left is what the clan really thinks.
            {:else}
                {signed(FOUNDING_ROUND_BONUS, 1)} × {FOUNDING_ROUND_BONUS_DECAY} per round ({appeal.round} so far)
                = {signed(appeal.bonus, 2)}: a nudge to show an interest early, before anyone knows who else
                might go. Gone by the last round.
            {/if}
        </p>
    {/if}
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

    .head + .note {
        margin-top: 0;
    }
</style>
