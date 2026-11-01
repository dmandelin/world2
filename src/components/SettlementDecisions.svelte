<script lang="ts">
    import type { SettlementDTO } from "../model/records/dtos";
    import { DECISION_CHANCE, type Decision } from "../model/decision";
    import { pct } from "../model/lib/format";
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
    const voter = (v: Decision["votes"][number]) => ({
        uuid: v.clan.uuid,
        name: v.clanName,
    });
</script>

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

<div class="decisions">
    <p class="lede">
        Now and then the clans of a village have something to settle together:
        one answer that all of them will have to live with. In any year there
        is a {pct(DECISION_CHANCE)} chance of one coming up. For now every clan
        picks between the choices at random, and nothing comes of the result.
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
                                <li><EntityLink entity={voter(v)} /></li>
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

    .choice {
        font-weight: 600;
        margin-right: 0.25rem;
    }

    .sep {
        margin: 0 0.4rem;
        color: #a08c5a;
    }
</style>
