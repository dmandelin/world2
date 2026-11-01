<script lang="ts">
    import type { ClanDTO, SettlementDTO } from "../model/records/dtos";
    import {
        DECISION_CHANCE,
        DECISION_EFFECT_HALF_LIFE,
        DECISION_ESTIMATE_SD,
        DECISION_FAVORABILITY_SD,
        decisionBirthRateModifier,
        decisionProductivityModifier,
        type Decision,
        type DecisionVote,
    } from "../model/decision";
    import { pct, signed } from "../model/lib/format";
    import { formatYear } from "../model/records/year";
    import EntityLink from "./state/EntityLink.svelte";

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
</script>

{#snippet favor(x: number)}
    <span class="favor" class:good={x > 0} class:bad={x < 0}>{signed(x, 1)}</span>
{/snippet}

{#snippet sides(decision: Decision)}
    {#each decision.choices as choice, i (choice)}
        {@const votes = decision.votesFor(choice)}
        {#if i > 0}<span class="sep">·</span>{/if}
        <span class="choice">{choice}</span>
        {#if votes.length}
            {#each votes as v, j (v.clan.uuid)}<EntityLink
                    entity={voter(v)}
                />{#if !v.gotItRight}<span
                        class="miss"
                        title="{v.bestChoice} would have been better for it"
                        >✗</span
                    >{/if}{j < votes.length - 1 ? ", " : ""}{/each}
        {:else}
            <span class="muted">nobody</span>
        {/if}
    {/each}
{/snippet}

<!-- Every clan's view of one decision: what each choice would actually do
     for it (the better one shaded), what it estimated (the one it picked
     marked), and whether it picked the better one. -->
{#snippet voteTable(decision: Decision)}
    <table class="votes">
        <thead>
            <tr>
                <th>Clan</th>
                <th
                    class="num"
                    title="The clan's intellect when it decided. Cleverer clans estimate more closely."
                    >Intellect</th
                >
                <th
                    class="num"
                    title="The spread of the clan's estimates around the true Favorability."
                    >Est. error</th
                >
                {#each decision.choices as choice (choice)}
                    <th class="choice-col">{choice}</th>
                {/each}
                <th
                    title="Whether the clan picked the choice that is actually better for it."
                    >Right?</th
                >
                <th
                    class="num"
                    title="The Favorability the clan gets: the agreed choice's, or the worse of the two if the village could not agree."
                    >Gets</th
                >
            </tr>
        </thead>
        <tbody>
            {#each decision.votes as v (v.clan.uuid)}
                <tr>
                    <td><EntityLink entity={voter(v)} /></td>
                    <td class="num">{v.intellect}</td>
                    <td class="num">±{v.estimateSD.toFixed(1)}</td>
                    {#each decision.choices as choice (choice)}
                        <td
                            class="choice-cell"
                            class:best={choice === v.bestChoice}
                            class:picked={choice === v.choice}
                        >
                            <span class="hand"
                                >{choice === v.choice ? "✋" : ""}</span
                            >
                            {@render favor(v.favorabilityOf(choice))}
                            <span class="est"
                                >est {signed(v.estimateOf(choice), 1)}</span
                            >
                        </td>
                    {/each}
                    <td class="verdict" class:right={v.gotItRight}>
                        {v.gotItRight ? "✓" : "✗"}
                    </td>
                    <td class="num">
                        {@render favor(decision.appliedFavorability(v))}
                    </td>
                </tr>
            {/each}
        </tbody>
    </table>
{/snippet}

<div class="decisions">
    <p class="lede">
        Now and then the clans of a village have something to settle together:
        one answer that all of them will have to live with. In any year there
        is a {pct(DECISION_CHANCE)} chance of one coming up.
    </p>
    <p class="lede">
        Each choice has a Favorability for each clan, how well it would go for
        that clan, drawn around zero with a spread of
        {DECISION_FAVORABILITY_SD}. A clan only has an estimate of each, off by
        a spread of {DECISION_ESTIMATE_SD} at ordinary intellect, half that for
        every step of cleverness above it and twice that for every step below,
        and picks whichever looks better. If every clan picks the same, every
        clan gets that choice's Favorability; if not, the village has failed to
        decide, and every clan gets the worse of the two for it. That is added
        straight into its Fortune, moves its birth rate by a two-hundredth of itself and its
        farming and fishing by a hundredth, and fades by half every
        {DECISION_EFFECT_HALF_LIFE} years.
    </p>

    <h3>This year</h3>
    {#if current}
        <p class="current">
            <strong>{current.choices.join(" or ")}?</strong>
            {current.tallyLabel}:
            <span class="outcome" class:consensus={current.consensus}
                >{current.outcomeLabel.toLowerCase()}</span
            >. {current.rightCount} of {current.votes.length} picked what was
            better for them.
        </p>
        {@render voteTable(current)}
        <p class="caption">
            Shaded: the choice that is actually better for the clan. ✋: the one
            it picked, going by its estimates. Gets: the agreed choice's
            Favorability, or with no agreement the worse of the two.
        </p>
    {:else}
        <p class="muted">Nothing for the village to decide this year.</p>
    {/if}

    <h3>What decisions are doing now</h3>
    <table>
        <thead>
            <tr>
                <th>Clan</th>
                <th class="num" title="Every decision's Favorability for the clan, faded to this year, added up. Goes straight into Fortune.">Favorability</th>
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
                    <th title="Clans that picked what was better for them.">Right</th>
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
                        <td class="num">{d.rightCount}/{d.votes.length}</td>
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

    .lede {
        margin: 0;
        max-width: 44rem;
    }

    h3 {
        margin: 1.2rem 0 0.4rem;
        font-size: 1rem;
        color: #62531d;
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

    .caption {
        margin: 0.3rem 0 0;
        font-size: 0.85rem;
        color: #6b5f3a;
        max-width: 44rem;
    }

    .votes th.choice-col {
        text-align: center;
    }

    .votes td.choice-cell {
        white-space: nowrap;
        text-align: right;
        font-variant-numeric: tabular-nums;
        border-left: 1px dotted #ded3ae;
    }

    /* The choice that is actually better for the clan. */
    .votes td.choice-cell.best {
        background-color: #e3f0df;
    }

    /* The one it picked. */
    .votes td.choice-cell.picked {
        box-shadow: inset 0 0 0 2px #62531d;
    }

    .hand {
        display: inline-block;
        width: 1.2em;
        text-align: left;
    }

    .est {
        margin-left: 0.3rem;
        font-size: 0.75em;
        color: #8a7f60;
    }

    .verdict {
        font-weight: 600;
        color: #9b2c2c;
        white-space: nowrap;
    }

    .verdict.right {
        color: #2f7d5b;
    }

    .miss {
        color: #9b2c2c;
        font-size: 0.8em;
        margin-left: 0.1rem;
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
