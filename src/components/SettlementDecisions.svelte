<script lang="ts">
    import type { Snippet } from "svelte";
    import type { ClanDTO, SettlementDTO } from "../model/records/dtos";
    import {
        DECISION_ESTIMATE_INTELLECT_BASELINE,
        DECISION_ESTIMATE_SD,
        INCLUSIVE_RIGHTEOUSNESS_EVEN,
        INCLUSIVE_RIGHTEOUSNESS_SELFISH,
        INCLUSIVE_TENDERNESS_BASELINE,
        decisionBirthRateModifier,
        decisionProductivityModifier,
        inclusiveTendernessFactor,
        type Decision,
        type DecisionVote,
    } from "../model/decision";
    import { TRAIT_SD } from "../model/people/traits";
    import { pct, signed } from "../model/lib/format";
    import { formatYear } from "../model/records/year";
    import EntityLink from "./state/EntityLink.svelte";
    import Tooltip from "./Tooltip.svelte";

    let { settlement }: { settlement: SettlementDTO } = $props();

    // What the village is deciding this year, if anything, and everything it
    // decided before, newest first.
    let current = $derived(settlement.decisionThisTurn);
    let past = $derived(
        [...settlement.decisions].reverse().filter((d) => d !== current),
    );

    // The clan as it was named when it voted, which still reads right after
    // it has split or gone.
    const voter = (v: DecisionVote) => ({
        uuid: v.clan.uuid,
        name: v.clanName,
    });

    const factor = (x: number) => "×" + x.toFixed(3);
    const tenderOf = (v: DecisionVote) => inclusiveTendernessFactor(v.tenderness);

    const higher = (v: DecisionVote, of: (c: string) => number) =>
        v.choices.reduce((a, b) => (of(b) > of(a) ? b : a));
</script>

{#snippet favor(x: number)}
    <span class="favor" class:good={x > 0} class:bad={x < 0}>{signed(x, 1)}</span>
{/snippet}

<!-- A column header with its explanation in a tooltip. -->
{#snippet header(label: string, note: string)}
    <Tooltip>
        <span class="help">{label}</span>
        <div slot="tooltip" class="calc"><p class="note">{note}</p></div>
    </Tooltip>
{/snippet}

<!-- One figure per choice, side by side, with the higher one shaded --
     or the one given, where that is not simply the higher -- and its working
     in a tooltip where there is any. -->
{#snippet pair(
    decision: Decision,
    v: DecisionVote,
    of: (c: string) => number,
    tip?: Snippet<[Decision, DecisionVote, string]>,
    shaded?: string,
    rule: boolean = false,
)}
    {@const best = shaded ?? higher(v, of)}
    {#each v.choices as choice, i (choice)}
        <td class="pair" class:rule={rule && i === 0} class:best={choice === best}>
            {#if tip}
                <Tooltip>
                    {@render favor(of(choice))}
                    <div slot="tooltip" class="calc">
                        {@render tip(decision, v, choice)}
                    </div>
                </Tooltip>
            {:else}
                {@render favor(of(choice))}
            {/if}
        </td>
    {/each}
{/snippet}

<!-- The clan's own estimate: the truth plus its error. -->
{#snippet estimateTip(_d: Decision, v: DecisionVote, choice: string)}
    <div class="head">{v.clanName}'s estimate of {choice}</div>
    <table>
        <tbody>
            <tr><td>Favorability</td><td class="n">{signed(v.favorabilityOf(choice), 1)}</td></tr>
            <tr>
                <td>Error drawn <span class="dim">(spread ±{v.estimateSD.toFixed(1)})</span></td>
                <td class="n">{signed(v.estimateOf(choice) - v.favorabilityOf(choice), 1)}</td>
            </tr>
            <tr class="total"><td>Estimate</td><td class="n">{signed(v.estimateOf(choice), 1)}</td></tr>
        </tbody>
    </table>
{/snippet}

<!-- Inclusive Favorability: everyone's estimates, as the clan weighs them. -->
{#snippet inclusiveTip(d: Decision, v: DecisionVote, choice: string)}
    {@const sum =
        v.estimateOf(choice) +
        v.weights.reduce(
            (a, w) => a + w.weight * (d.voteOf(w.clan)?.estimateOf(choice) ?? 0),
            0,
        )}
    <div class="head">{v.clanName}'s Inclusive Favorability of {choice}</div>
    <table>
        <thead>
            <tr><th>Clan</th><th class="n">Weight</th><th class="n">Estimate</th><th class="n">Weighted</th></tr>
        </thead>
        <tbody>
            <tr>
                <td>{v.clanName} <span class="dim">(itself)</span></td>
                <td class="n">1.00</td>
                <td class="n">{signed(v.estimateOf(choice), 1)}</td>
                <td class="n">{signed(v.estimateOf(choice), 1)}</td>
            </tr>
            {#each v.weights as w (w.clan.uuid)}
                {@const e = d.voteOf(w.clan)?.estimateOf(choice) ?? 0}
                <tr>
                    <td>{w.clanName}</td>
                    <td class="n">{signed(w.weight, 2)}</td>
                    <td class="n">{signed(e, 1)}</td>
                    <td class="n">{signed(w.weight * e, 1)}</td>
                </tr>
            {/each}
            <tr class="total">
                <td colspan="3">Sum</td>
                <td class="n">{signed(sum, 1)}</td>
            </tr>
            <tr>
                <td colspan="3">÷ total weight (1 + {v.totalWeight.toFixed(2)})</td>
                <td class="n">{(1 + v.totalWeight).toFixed(2)}</td>
            </tr>
            <tr class="total">
                <td colspan="3">Inclusive Favorability</td>
                <td class="n">{signed(v.inclusiveEstimateOf(choice), 1)}</td>
            </tr>
        </tbody>
    </table>
    <p class="note">Weights are from the Others column. A negative weight counts what is good for that clan against the choice.</p>
{/snippet}

<!-- What the clan would get from a choice, given the others' picks. -->
{#snippet coordinatedTip(d: Decision, v: DecisionVote, choice: string)}
    {@const others = d.votes.filter((o) => o !== v)}
    {@const against = others.filter((o) => o.inclusiveChoice !== choice)}
    <div class="head">{v.clanName}'s Coordinated Favorability of {choice}</div>
    {#if against.length === 0}
        <p class="note">
            {others.length ? `Every other clan is for ${choice}` : "There is no other clan"},
            so {choice} means agreement, and is worth its Inclusive Favorability:
            {signed(v.inclusiveEstimateOf(choice), 1)}.
        </p>
    {:else}
        <p class="note">
            {against.map((o) => o.clanName).join(", ")}
            {against.length === 1 ? "is" : "are"} for
            {against.map((o) => o.inclusiveChoice).filter((c, i, a) => a.indexOf(c) === i).join(", ")},
            so {choice} means failing to agree, and every clan gets its worst:
        </p>
        <table class="spaced">
            <thead>
                <tr><th>Clan</th><th class="n">Weight</th><th class="n">Worst est.</th><th class="n">Weighted</th></tr>
            </thead>
            <tbody>
                <tr>
                    <td>{v.clanName} <span class="dim">(itself)</span></td>
                    <td class="n">1.00</td>
                    <td class="n">{signed(v.worstEstimate, 1)}</td>
                    <td class="n">{signed(v.worstEstimate, 1)}</td>
                </tr>
                {#each v.weights as w (w.clan.uuid)}
                    {@const worst = d.voteOf(w.clan)?.worstEstimate ?? 0}
                    <tr>
                        <td>{w.clanName}</td>
                        <td class="n">{signed(w.weight, 2)}</td>
                        <td class="n">{signed(worst, 1)}</td>
                        <td class="n">{signed(w.weight * worst, 1)}</td>
                    </tr>
                {/each}
                <tr class="total">
                    <td colspan="3">Sum</td>
                    <td class="n">{signed(v.failureEstimate * (1 + v.totalWeight), 1)}</td>
                </tr>
                <tr>
                    <td colspan="3">÷ total weight (1 + {v.totalWeight.toFixed(2)})</td>
                    <td class="n">{(1 + v.totalWeight).toFixed(2)}</td>
                </tr>
                <tr class="total">
                    <td colspan="3">Failing to agree</td>
                    <td class="n">{signed(v.failureEstimate, 1)}</td>
                </tr>
            </tbody>
        </table>
    {/if}
    {#if v.coordinationTied}
        <p class="note">Both choices come to the same, so it went by its Inclusive Favorability: {v.choice}.</p>
    {/if}
{/snippet}

<!-- How the estimate error came out of intellect. -->
{#snippet errorTip(v: DecisionVote)}
    <div class="head">{v.clanName}'s estimate error</div>
    <table>
        <tbody>
            <tr><td>Intellect</td><td class="n">{v.intellect}</td></tr>
            <tr>
                <td>Spread at {DECISION_ESTIMATE_INTELLECT_BASELINE}</td>
                <td class="n">±{DECISION_ESTIMATE_SD.toFixed(1)}</td>
            </tr>
            <tr>
                <td>× 0.5^(({v.intellect} − {DECISION_ESTIMATE_INTELLECT_BASELINE}) / {TRAIT_SD})</td>
                <td class="n">×{(v.estimateSD / DECISION_ESTIMATE_SD).toFixed(2)}</td>
            </tr>
            <tr class="total"><td>Spread</td><td class="n">±{v.estimateSD.toFixed(1)}</td></tr>
        </tbody>
    </table>
{/snippet}

<!-- How much the clan weighs the others, and each of them. -->
{#snippet othersTip(v: DecisionVote)}
    <div class="head">Whom {v.clanName} weighs</div>
    <table>
        <tbody>
            <tr><td>Righteousness</td><td class="n">{v.righteousness}</td></tr>
            <tr>
                <td>Care: ({v.righteousness} − {INCLUSIVE_RIGHTEOUSNESS_SELFISH}) / ({INCLUSIVE_RIGHTEOUSNESS_EVEN} − {INCLUSIVE_RIGHTEOUSNESS_SELFISH}), within 0–1</td>
                <td class="n">{v.care.toFixed(2)}</td>
            </tr>
        </tbody>
    </table>
    {#if v.weights.length}
        <table class="spaced">
            <thead>
                <tr>
                    <th>Clan</th>
                    <th class="n">Sympathy</th>
                    <th class="n">Feeling</th>
                    <th class="n">Knows</th>
                    <th class="n">Weight</th>
                </tr>
            </thead>
            <tbody>
                {#each v.weights as w (w.clan.uuid)}
                    <tr>
                        <td>{w.clanName}</td>
                        <td class="n">{signed(100 * w.alignment, 0)}</td>
                        <td class="n">{signed(w.feeling, 2)}</td>
                        <td class="n">{pct(w.conversation)}</td>
                        <td class="n">{signed(w.weight, 2)}</td>
                    </tr>
                {/each}
                <tr class="total">
                    <td colspan="4">All others, against its own 1</td>
                    <td class="n">{v.totalWeight.toFixed(2)}</td>
                </tr>
            </tbody>
        </table>
        <p class="note">Feeling is Sympathy × the clan's tenderness factor ({tenderOf(v).toFixed(2)}), within ±1. Weight = care × feeling × knows.</p>
    {:else}
        <p class="note">It weighed no one but itself.</p>
    {/if}
{/snippet}

<!-- How tenderness scales Sympathy. -->
{#snippet tenderTip(v: DecisionVote)}
    <div class="head">{v.clanName}'s tenderness</div>
    <table>
        <tbody>
            <tr><td>Tenderness</td><td class="n">{v.tenderness}</td></tr>
            <tr>
                <td>2^(({v.tenderness} − {INCLUSIVE_TENDERNESS_BASELINE}) / {TRAIT_SD})</td>
                <td class="n">×{tenderOf(v).toFixed(2)}</td>
            </tr>
        </tbody>
    </table>
    <p class="note">What Sympathy for a neighbor counts for when the clan weighs its interests.</p>
{/snippet}

<!-- What the clan gets, and why. -->
{#snippet getsTip(d: Decision, v: DecisionVote)}
    <div class="head">What {v.clanName} gets</div>
    {#if d.result !== undefined}
        <p class="note">The village agreed on {d.result}, so it gets its Favorability for {d.result}: {signed(v.favorabilityOf(d.result), 1)}.</p>
    {:else}
        <p class="note">The village could not agree, so it gets the worse of its Favorabilities: {v.choices.map((c) => `${c} ${signed(v.favorabilityOf(c), 1)}`).join(", ")}.</p>
    {/if}
{/snippet}

{#snippet sides(decision: Decision)}
    {#each decision.choices as choice, i (choice)}
        {@const votes = decision.votesFor(choice)}
        {#if i > 0}<span class="sep">·</span>{/if}
        <span class="choice">{choice}</span>
        {#if votes.length}
            {#each votes as v, j (v.clan.uuid)}<EntityLink
                    entity={voter(v)}
                />{j < votes.length - 1 ? ", " : ""}{/each}
        {:else}
            <span class="muted">nobody</span>
        {/if}
    {/each}
{/snippet}

<!-- Every clan's view of one decision, from what each choice would really do
     for it, through what it made of that, to what it made of everyone's
     interests together -- the last of which it picks by. -->
{#snippet voteTable(decision: Decision)}
    <table class="votes">
        <thead>
            <tr>
                <th rowspan="2">Clan</th>
                <th colspan="2" class="group">
                    {@render header("Favorability", "How well each choice would actually go for the clan.")}
                </th>
                <th rowspan="2" class="num rule">
                    {@render header("Est. error", "How far off the clan's estimates are: the spread of its error, from its intellect.")}
                </th>
                <th colspan="2" class="group">
                    {@render header("Estimate", "What the clan made of each Favorability: the truth plus an error drawn from its spread.")}
                </th>
                <th rowspan="2" class="num rule">
                    {@render header("Others", `How much a neighbor the clan feels fully for and knows well counts against its own 1, from righteousness: nothing at ${INCLUSIVE_RIGHTEOUSNESS_SELFISH} or below, as much as itself at ${INCLUSIVE_RIGHTEOUSNESS_EVEN} or above.`)}
                </th>
                <th rowspan="2" class="num">
                    {@render header("Tender", "What tenderness makes of the clan's Sympathy for others when weighing their interests.")}
                </th>
                <th colspan="2" class="group">
                    {@render header("Inclusive", "Inclusive Favorability: the clan's own estimate averaged with what the clans it talks with told it, as it weighs them. This is what it is for.")}
                </th>
                <th colspan="2" class="group rule">
                    {@render header("Coordinated", "What the clan would actually get from each choice, as it weighs everyone, given what the others are for: the Inclusive Favorability if every other clan is for it too, and otherwise the value of failing to agree. It picks the shaded one: the higher, or by Inclusive Favorability when they are the same.")}
                </th>
                <th rowspan="2" class="num rule">
                    {@render header("Gets", "The Favorability the clan gets: the agreed choice's, or the worse of the two if the village could not agree.")}
                </th>
            </tr>
            <tr>
                {#each [0, 1, 2, 3] as g (g)}
                    {#each decision.choices as choice, i (choice)}
                        <th class="sub" class:rule={g === 3 && i === 0}>{choice}</th>
                    {/each}
                {/each}
            </tr>
        </thead>
        <tbody>
            {#each decision.votes as v (v.clan.uuid)}
                <tr>
                    <td><EntityLink entity={voter(v)} /></td>
                    {@render pair(decision, v, (c) => v.favorabilityOf(c))}
                    <td class="num rule">
                        <Tooltip>
                            <span class="help">±{v.estimateSD.toFixed(1)}</span>
                            <div slot="tooltip" class="calc">{@render errorTip(v)}</div>
                        </Tooltip>
                    </td>
                    {@render pair(decision, v, (c) => v.estimateOf(c), estimateTip)}
                    <td class="num rule">
                        <Tooltip>
                            <span class="help">{v.care.toFixed(2)}</span>
                            <div slot="tooltip" class="calc">{@render othersTip(v)}</div>
                        </Tooltip>
                    </td>
                    <td class="num">
                        <Tooltip>
                            <span class="help">×{tenderOf(v).toFixed(2)}</span>
                            <div slot="tooltip" class="calc">{@render tenderTip(v)}</div>
                        </Tooltip>
                    </td>
                    {@render pair(decision, v, (c) => v.inclusiveEstimateOf(c), inclusiveTip)}
                    {@render pair(decision, v, (c) => v.coordinatedEstimateOf(c), coordinatedTip, v.choice, true)}
                    <td class="num rule">
                        <Tooltip>
                            {@render favor(decision.appliedFavorability(v))}
                            <div slot="tooltip" class="calc">{@render getsTip(decision, v)}</div>
                        </Tooltip>
                    </td>
                </tr>
            {/each}
        </tbody>
    </table>
{/snippet}

<div class="decisions">
    <h3>This year</h3>
    {#if current}
        <p class="current">
            <strong>{current.choices.join(" or ")}?</strong>
            {current.tallyLabel}:
            <span class="outcome" class:consensus={current.consensus}
                >{current.outcomeLabel}</span
            >.
        </p>
        {@render voteTable(current)}
    {:else}
        <p class="muted">Nothing for the village to decide this year.</p>
    {/if}

    <h3>What decisions are doing now</h3>
    <table>
        <thead>
            <tr>
                <th>Clan</th>
                <th class="num">
                    {@render header("Favorability", "Every decision's Favorability for the clan, faded to this year, added up. Goes straight into Fortune.")}
                </th>
                <th class="num">Birth rate</th>
                <th class="num">Farming &amp; fishing</th>
            </tr>
        </thead>
        <tbody>
            {#each settlement.clans as clan (clan.uuid)}
                {@const f = (clan as ClanDTO).decisionFavorability}
                <tr>
                    <td><EntityLink entity={clan} /></td>
                    <td class="num">{@render favor(f)}</td>
                    <td class="num">{factor(decisionBirthRateModifier(f))}</td>
                    <td class="num">{factor(decisionProductivityModifier(f))}</td>
                </tr>
            {/each}
        </tbody>
    </table>

    <h3>Past decisions</h3>
    {#if past.length}
        <table>
            <thead>
                <tr>
                    <th>Year</th>
                    <th>Question</th>
                    <th>Tally</th>
                    <th>Outcome</th>
                    <th>Who chose what</th>
                </tr>
            </thead>
            <tbody>
                {#each past as d (d.year)}
                    <tr>
                        <td class="year">{formatYear(d.year)}</td>
                        <td>{d.choices.join(" or ")}</td>
                        <td class="num">{d.tallyLabel}</td>
                        <td class="outcome" class:consensus={d.consensus}
                            >{d.outcomeLabel}</td
                        >
                        <td>
                            <details>
                                <summary>{@render sides(d)}</summary>
                                {@render voteTable(d)}
                            </details>
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    {:else}
        <p class="muted">The village has not had to decide anything yet.</p>
    {/if}
</div>

<style>
    .decisions {
        max-width: 60rem;
    }

    h3 {
        margin: 1.2rem 0 0.4rem;
        font-size: 1rem;
        color: #62531d;
    }

    h3:first-child {
        margin-top: 0;
    }

    .current {
        margin: 0 0 0.4rem;
        padding: 0.5rem 0.7rem;
        max-width: 44rem;
        border-left: 3px solid #4a5a2a;
        background-color: #f1f3e6;
    }

    .muted {
        color: #8a7f60;
    }

    .outcome {
        font-weight: 600;
        color: #9b2c2c;
    }

    .outcome.consensus {
        color: #2f7d5b;
    }

    /* A pair of choices reads as one: a header spanning both, and the
       higher of the two shaded. */
    .votes th.group {
        text-align: center;
        border-bottom: 1px dotted #c4b98a;
    }

    .votes th.sub {
        text-align: right;
        font-weight: normal;
    }

    /* Rules between the stages: what is so; what the clan makes of it;
       how it weighs everyone in; what it gets. */
    .votes .rule {
        border-left: 1px solid #c4b98a;
    }

    .votes td.pair {
        text-align: right;
        font-variant-numeric: tabular-nums;
    }

    .votes td.pair.best {
        background-color: #e3f0df;
    }

    .votes td.pair .favor {
        font-size: 1em;
    }

    /* The working behind a figure, in its tooltip. */
    .calc {
        font-size: 0.8rem;
        color: #2c1e05;
    }

    .calc .head {
        font-weight: 600;
        color: #62531d;
        margin-bottom: 0.25rem;
    }

    .calc table {
        border-collapse: collapse;
        font-size: 1em;
    }

    .calc table.spaced {
        margin-top: 0.4rem;
    }

    .calc th,
    .calc td {
        padding: 0.05rem 0.4rem 0.05rem 0;
        border: none;
        vertical-align: baseline;
    }

    .calc th {
        font-weight: normal;
        color: #6b5f3a;
        border-bottom: 1px solid #c4b98a;
    }

    .calc .n {
        text-align: right;
        font-variant-numeric: tabular-nums;
        padding-left: 0.8rem;
    }

    .calc tr.total td {
        border-top: 1px solid #c4b98a;
        font-weight: 600;
    }

    .calc .dim {
        color: #8a7f60;
    }

    .calc .note {
        margin: 0.35rem 0 0;
        max-width: 22rem;
        white-space: normal;
        color: #6b5f3a;
    }

    .calc .head + .note {
        margin-top: 0;
    }

    .calc > .note:only-child {
        margin: 0;
    }

    .help {
        cursor: help;
    }

    details summary {
        cursor: pointer;
    }

    details .votes {
        margin: 0.3rem 0 0.4rem;
    }

    table {
        border-collapse: collapse;
        font-size: 0.85rem;
    }

    th {
        font-weight: 600;
        color: #6b5f3a;
        border-bottom: 1px solid #c4b98a;
        padding: 0.15rem 0.5rem;
        text-align: left;
        vertical-align: bottom;
    }

    td {
        padding: 0.15rem 0.5rem;
        border-bottom: 1px dotted #ded3ae;
        vertical-align: top;
    }

    td.year,
    td.num {
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
    }

    .favor {
        font-size: 0.8em;
        font-variant-numeric: tabular-nums;
        color: #8a7f60;
    }

    .favor.good {
        color: #2f7d5b;
    }

    .favor.bad {
        color: #9b2c2c;
    }

    th.num {
        text-align: right;
    }

    td.num {
        text-align: right;
    }

    .choice {
        font-weight: 600;
        margin-right: 0.25rem;
    }

    .sep {
        margin: 0 0.4rem;
        color: #a08c5a;
    }
</style>
