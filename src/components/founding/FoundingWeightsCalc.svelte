<script lang="ts">
    // What a clan's personality makes of each part of the appeal.
    import {
        FOUNDING_ALIGNMENT_COEFFICIENT,
        FOUNDING_FAVOR_COEFFICIENT,
        FOUNDING_INTELLECT_POPULATION,
        FOUNDING_INTELLECT_RANDOM,
        FOUNDING_PEACEABLENESS_FAVOR,
        FOUNDING_POPULATION_COEFFICIENT,
        FOUNDING_RANDOM_SCALE,
        FOUNDING_SOCIABILITY_POPULATION,
        FOUNDING_TENDERNESS_ALIGNMENT,
        FOUNDING_TENDERNESS_FAVOR,
        type FoundingVote,
    } from "../../model/people/migration";
    import { TRAIT_SD } from "../../model/people/traits";

    let { vote }: { vote: FoundingVote } = $props();

    let w = $derived(vote.weights);
    const f = (perSD: number, trait: number) => Math.pow(perSD, (trait - 50) / TRAIT_SD);
    const x = (v: number) => "×" + v.toFixed(2);
</script>

<div class="calc">
    <div class="head">{vote.clanName}'s weights</div>
    <table>
        <thead>
            <tr><th>Part</th><th class="n">Base</th><th>Personality</th><th class="n">Weight</th></tr>
        </thead>
        <tbody>
            <tr>
                <td>People</td>
                <td class="n">{FOUNDING_POPULATION_COEFFICIENT.toFixed(2)}</td>
                <td class="dim">
                    Intellect {w.intellect} {x(f(FOUNDING_INTELLECT_POPULATION, w.intellect))},
                    Sociability {w.sociability} {x(f(FOUNDING_SOCIABILITY_POPULATION, w.sociability))}
                </td>
                <td class="n">{w.population.toFixed(2)}</td>
            </tr>
            <tr>
                <td>Favor</td>
                <td class="n">{FOUNDING_FAVOR_COEFFICIENT.toFixed(2)}</td>
                <td class="dim">
                    Tenderness {w.tenderness} {x(f(FOUNDING_TENDERNESS_FAVOR, w.tenderness))},
                    Peaceableness {w.peaceableness} {x(f(FOUNDING_PEACEABLENESS_FAVOR, w.peaceableness))}
                </td>
                <td class="n">{w.favor.toFixed(2)}</td>
            </tr>
            <tr>
                <td>Alignment</td>
                <td class="n">{FOUNDING_ALIGNMENT_COEFFICIENT.toFixed(2)}</td>
                <td class="dim">Tenderness {w.tenderness} {x(f(FOUNDING_TENDERNESS_ALIGNMENT, w.tenderness))}</td>
                <td class="n">{w.alignment.toFixed(2)}</td>
            </tr>
            <tr>
                <td>Random</td>
                <td class="n">{FOUNDING_RANDOM_SCALE.toFixed(2)}</td>
                <td class="dim">Intellect {w.intellect} {x(w.randomFactor)}</td>
                <td class="n">{(FOUNDING_RANDOM_SCALE * w.randomFactor).toFixed(2)}</td>
            </tr>
        </tbody>
    </table>
    <p class="note">
        Each trait multiplies its weight by a factor per {TRAIT_SD} points from 50.
        The random part is the year's (d6 − d6) roll, {vote.roll >= 0 ? "+" : ""}{vote.roll}, times its weight.
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

    th,
    td {
        padding: 0.05rem 0.4rem 0.05rem 0;
        border: none;
        vertical-align: baseline;
        text-align: left;
    }

    th {
        font-weight: normal;
        color: #6b5f3a;
        border-bottom: 1px solid #c4b98a;
    }

    .n {
        text-align: right;
        font-variant-numeric: tabular-nums;
        padding-left: 0.8rem;
    }

    .dim {
        color: #8a7f60;
    }

    .note {
        margin: 0.35rem 0 0;
        max-width: 24rem;
        white-space: normal;
        color: #6b5f3a;
    }
</style>
