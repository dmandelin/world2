<script lang="ts">
    import type { ClanDTO, SettlementDTO } from "../model/records/dtos";
    import {
        DECISION_CHANCE,
        DECISION_EFFECT_HALF_LIFE,
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
                /> {@render favor(v.favorability)}{j < votes.length - 1
                    ? ", "
                    : ""}{/each}
        {:else}
            <span class="muted">nobody</span>
        {/if}
    {/each}
{/snippet}

<div class="decisions">
    <p class="lede">
        Now and then the clans of a village have something to settle together:
        one answer that all of them will have to live with. In any year there
        is a {pct(DECISION_CHANCE)} chance of one coming up. For now every clan
        picks between the choices at random.
    </p>
    <p class="lede">
        How it goes for each clan is as random as the picks: a Favorability,
        drawn around zero with a spread of {DECISION_FAVORABILITY_SD}. It is
        added straight into the clan's Fortune, moves its birth rate by a
        two-hundredth of itself and its farming and fishing by a hundredth, and
        fades by half every {DECISION_EFFECT_HALF_LIFE} years.
    </p>

    <h3>This year</h3>
    {#if current}
        <p class="current">
            <strong>{current.choices.join(" or ")}?</strong>
            {current.tallyLabel}:
            <span class="outcome" class:consensus={current.consensus}
                >{current.outcomeLabel.toLowerCase()}</span
            >.
        </p>
        <div class="columns">
            {#each current.choices as choice (choice)}
                {@const votes = current.votesFor(choice)}
                <div class="column" class:won={current.result === choice}>
                    <div class="column-head">
                        {choice} <span class="count">{votes.length}</span>
                    </div>
                    {#if votes.length}
                        <ul>
                            {#each votes as v (v.clan.uuid)}
                                <li>
                                    <EntityLink entity={voter(v)} />
                                    {@render favor(v.favorability)}
                                </li>
                            {/each}
                        </ul>
                    {:else}
                        <div class="muted">nobody</div>
                    {/if}
                </div>
            {/each}
        </div>
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
                        <td>{@render sides(d)}</td>
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

    .columns {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
    }

    .column {
        min-width: 10rem;
        padding: 0.3rem 0.6rem;
        border: 1px solid #ded3ae;
        border-radius: 4px;
        font-size: 0.9rem;
    }

    .column.won {
        border-color: #2f7d5b;
    }

    .column-head {
        font-weight: 600;
        color: #62531d;
        border-bottom: 1px solid #ded3ae;
        margin-bottom: 0.2rem;
    }

    .count {
        float: right;
        font-variant-numeric: tabular-nums;
        color: #8a7f60;
    }

    .column ul {
        margin: 0;
        padding: 0;
        list-style: none;
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
