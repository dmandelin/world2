<script lang="ts">
    // One remembered item: when the clan says it happened, what it calls it,
    // and -- at higher detail -- the story in the voice its age calls for, with
    // the model's side (exact years, figures) folded away beneath.
    import type { Snippet } from "svelte";
    import {
        HISTORY_TIMEFRAME_DEFS,
        WHEN_LEVELS,
        timeframeTooltip,
        type AnyHistoryItem,
        type FloodMemory,
        type History,
    } from "../../model/people/history";
    import {
        historyItemTitle,
        tellHistoryItem,
    } from "../../model/people/historytales";
    import { formatYear } from "../../model/records/year";
    import EudaimoniaCalc from "../self/EudaimoniaCalc.svelte";
    import Tooltip from "../Tooltip.svelte";
    import type { Eudaimonia } from "../../model/self/eudaimonia";
    import type { HistoryDetail } from "./historydetail.svelte";

    let {
        item,
        history,
        clanName,
        detail = "default",
        showWhen = true,
        rememberers,
        aside,
        footer,
    }: {
        item: AnyHistoryItem;
        // The history that holds the item, which knows how old it is.
        history: History;
        // The clan telling it.
        clanName: string;
        // How much to show: default leaves out the story and the year; high
        // adds them; debug opens the model details too.
        detail?: HistoryDetail;
        // Say when the clan thinks it happened. Off where a listing already
        // heads a group of items with it.
        showWhen?: boolean;
        // Every clan's copy of this event where a listing row stands for all
        // of them, so the chip's tooltip can give what it cost each. Defaults
        // to this clan's alone.
        rememberers?: readonly { clanName: string; item: AnyHistoryItem }[];
        // Extra content at the end of the heading line.
        aside?: Snippet;
        // Extra content under the story, above the model details.
        footer?: Snippet;
    } = $props();

    let tf = $derived(HISTORY_TIMEFRAME_DEFS.get(history.timeframeOf(item))!);
    let age = $derived(history.yearsAgo(item));

    // What a flood cost, one row per memory. Clans that split after the flood
    // hold copies of one memory, which share an id, so they share a row
    // rather than counting the same losses twice.
    let lossRows = $derived.by(() => {
        const rows = new Map<number, { names: string[]; m: FloodMemory }>();
        for (const r of rememberers ?? [{ clanName, item }]) {
            if (r.item.kind !== "flood") continue;
            const row = rows.get(r.item.id);
            if (row) row.names.push(r.clanName);
            else rows.set(r.item.id, { names: [r.clanName], m: r.item });
        }
        return [...rows.values()];
    });

    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    const signed = (x: number, p = 1) =>
        (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(p);
    const pct = (x: number) => (x * 100).toFixed(0) + "%";
</script>

<!-- The Fortune behind a Fortune record, component by component, as that
     year went. -->
{#snippet fortuneBreakdown(snapshot: Eudaimonia)}
    <EudaimoniaCalc eudaimonia={snapshot} fortune={true} />
{/snippet}

<div class="item {tf.key} kind-{item.kind}">
    <div class="head">
        {#if showWhen}
            <span class="when" title={cap(WHEN_LEVELS[item.when].range)}
                >{cap(history.whenLabel(item))}</span
            >
        {/if}
        <!-- A cell as wide as the longest title, so whatever follows lines
             up down a listing. -->
        <span class="title-cell">
            <!-- The whole story on hover, whatever the detail level, with
                 what a flood cost or what made up a year's Fortune under it. -->
            <Tooltip>
                <span
                    class="title help chip-{item.kind === 'fortune'
                        ? item.polarity
                        : item.kind}">{historyItemTitle(item)}</span
                >
                <div slot="tooltip" class="chip-tooltip">
                    <p class="tale">{tellHistoryItem(item, tf.key, clanName)}</p>
                    {#if item.kind === "fortune"}
                        <div class="eu-tooltip tip-breakdown">
                            {@render fortuneBreakdown(item.snapshot)}
                        </div>
                    {:else if item.kind === "flood"}
                        <div class="tip-breakdown">
                            <table class="losses">
                                <thead>
                                    <tr>
                                        <th>Clan</th>
                                        <th class="num">Grain lost</th>
                                        <th class="num">Of year's food</th>
                                        <th class="num">Drowned</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {#each lossRows as row (row.m.id)}
                                        <tr>
                                            <td>{row.names.join(", ")}</td>
                                            <td class="num"
                                                >{row.m.cropsLost.toFixed(1)}</td
                                            >
                                            <td class="num"
                                                >{pct(row.m.foodShareLost)}</td
                                            >
                                            <td class="num">{row.m.deaths}</td>
                                        </tr>
                                    {/each}
                                    {#if lossRows.length > 1}
                                        <tr class="total">
                                            <td>All</td>
                                            <td class="num"
                                                >{lossRows
                                                    .reduce((t, r) => t + r.m.cropsLost, 0)
                                                    .toFixed(1)}</td
                                            >
                                            <td></td>
                                            <td class="num"
                                                >{lossRows.reduce(
                                                    (t, r) => t + r.m.deaths,
                                                    0,
                                                )}</td
                                            >
                                        </tr>
                                    {/if}
                                </tbody>
                            </table>
                            {#if lossRows.some((r) => r.names.length > 1)}
                                <div class="tip-note">
                                    Clans named together were still one clan
                                    when the flood came.
                                </div>
                            {/if}
                        </div>
                    {/if}
                </div>
            </Tooltip>
        </span>
        {@render aside?.()}
    </div>
    {#if detail !== "default"}
        <p class="tale">{tellHistoryItem(item, tf.key, clanName)}</p>
    {/if}
    {@render footer?.()}
    {#if detail !== "default"}
        <details class="model" open={detail === "debug"}>
            <summary>
                {item.year === undefined
                    ? "before the simulation"
                    : `${formatYear(item.year)} · ${age} yr ago`}
            </summary>
            <dl>
                <dt>Year</dt>
                <dd>
                    {item.year === undefined
                        ? "Before the simulation began"
                        : formatYear(item.year)}
                </dd>
                <dt>Years ago</dt>
                <dd>
                    {age === undefined ? "—" : age}
                    <span class="muted">as of {formatYear(history.asOf)}</span>
                </dd>
                <dt>Clan knows it as</dt>
                <dd>
                    {WHEN_LEVELS[item.when].label}
                    <span class="muted"
                        >level {item.when}, {WHEN_LEVELS[item.when].range}</span
                    >
                </dd>
                <dt>Told as</dt>
                <dd class="help" title={timeframeTooltip(tf)}>{tf.label}</dd>
                <dt>Event</dt>
                <dd>
                    #{item.eventId}
                    <span class="muted">item #{item.id}</span>
                </dd>

                {#if item.kind === "origin"}
                    <dt>Maternal ancestor</dt>
                    <dd>{item.maternalAncestor}</dd>
                    <dt>Paternal ancestor</dt>
                    <dd>{item.paternalAncestor}</dd>
                    <dt>Split</dt>
                    {#if item.split}
                        <dd>
                            {item.split.role} house;
                            {item.split.role === "senior" ? "cadet" : "senior"} is
                            {item.split.otherName}
                        </dd>
                    {:else}
                        <dd>none: one of the world's first clans</dd>
                    {/if}
                {:else if item.kind === "flood"}
                    <dt>Flood</dt>
                    <dd>{item.floodName}</dd>
                    <dt>Grain lost</dt>
                    <dd>
                        {item.cropsLost.toFixed(1)}
                        <span class="muted"
                            >{pct(item.foodShareLost)} of the year's needs</span
                        >
                    </dd>
                    <dt>Drowned</dt>
                    <dd>
                        {item.deaths}
                        <span class="muted"
                            >{item.deathsExact.toFixed(2)} attributed</span
                        >
                    </dd>
                    <dt>Clan size</dt>
                    <dd>{item.population}</dd>
                    <dt>Ditch helped</dt>
                    <dd>{item.ditchHelped ? "yes" : "no"}</dd>
                {:else if item.kind === "fortune"}
                    <dt>Fortune</dt>
                    <dd>
                        {#if detail === "debug"}
                            <Tooltip>
                                <span class="help figure"
                                    >{signed(item.fortune)}</span
                                >
                                <div slot="tooltip" class="eu-tooltip">
                                    {@render fortuneBreakdown(item.snapshot)}
                                </div>
                            </Tooltip>
                        {:else}
                            {signed(item.fortune)}
                        {/if}
                    </dd>
                    <dt>Record for</dt>
                    <dd>
                        {item.polarity}:
                        {#each item.periods as p, i (p)}
                            {@const def = HISTORY_TIMEFRAME_DEFS.get(p)!}
                            <span class="help" title={timeframeTooltip(def)}
                                >{def.label.toLowerCase()}</span
                            >{i < item.periods.length - 1 ? ", " : ""}
                        {/each}
                    </dd>
                {/if}
            </dl>
        </details>
    {/if}
</div>

<style>
    .head {
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
        flex-wrap: wrap;
    }

    .when {
        font-weight: 600;
        font-size: 0.85rem;
        color: #1f2328;
        cursor: help;
    }

    /* Sized in the title's own font: "Worst year in the family stories" is
       the longest title, plus the chip's padding. */
    .title-cell {
        display: inline-block;
        font-size: 0.72rem;
        min-width: calc(32ch + 0.7rem);
    }

    .title {
        font-size: 0.72rem;
        color: #7c2d12;
        background: #f3edd8;
        border-radius: 3px;
        padding: 0 0.35rem;
    }

    /* A colour for each kind of thing remembered. */
    .chip-origin {
        color: #5b3a7a;
        background: #efe7f4;
    }

    .chip-flood {
        color: #1f5a85;
        background: #e1edf7;
    }

    .chip-best {
        color: #2f6b2a;
        background: #e3f0df;
    }

    .chip-worst {
        color: #9a3412;
        background: #f8e3da;
    }

    .tale {
        margin: 0.15rem 0 0.1rem;
        font-size: 0.88rem;
        line-height: 1.45;
        max-width: 60ch;
    }

    /* The further back, the more it reads like a tale than a record. */
    .recent .tale {
        color: #1f2328;
    }

    .living .tale {
        color: #3f3a2c;
        font-style: italic;
    }

    .family .tale {
        font-family: Georgia, "Times New Roman", serif;
        font-style: italic;
        color: #5b4a26;
    }

    .ancient .tale {
        font-family: Georgia, "Times New Roman", serif;
        color: #6b3f1d;
        letter-spacing: 0.01em;
    }

    .model summary {
        font-size: 0.72rem;
        color: #9ca3af;
        cursor: pointer;
        width: fit-content;
    }

    .model summary:hover {
        color: #7c2d12;
    }

    dl {
        display: grid;
        grid-template-columns: max-content 1fr;
        gap: 0.1rem 0.8rem;
        margin: 0.3rem 0 0.2rem;
        padding: 0.35rem 0.5rem;
        background: #fbfaf5;
        border: 1px solid #e5e0d0;
        border-radius: 3px;
        font-size: 0.78rem;
    }

    dt {
        color: #6b7280;
    }

    dd {
        margin: 0;
        font-variant-numeric: tabular-nums;
    }

    .help {
        cursor: help;
    }

    .figure {
        border-bottom: 1px dotted #9ca3af;
    }

    .muted {
        color: #9ca3af;
        margin-left: 0.3rem;
    }

    .chip-tooltip {
        width: 26rem;
        max-width: 80vw;
        white-space: normal;
        text-align: left;
    }

    .chip-tooltip .tale {
        margin: 0;
    }

    .tip-breakdown {
        margin-top: 0.5rem;
        padding-top: 0.45rem;
        border-top: 1px solid #e5e0d0;
    }

    .eu-tooltip {
        text-align: left;
        color: initial;
        white-space: normal;
    }

    table.losses {
        border-collapse: collapse;
        width: 100%;
        font-size: 0.8rem;
    }

    .losses th {
        font-weight: 600;
        color: #6b7280;
        text-align: left;
        border-bottom: 1px solid #e5e0d0;
        padding: 0 0.4rem 0.15rem 0;
    }

    .losses td {
        padding: 0.1rem 0.4rem 0.1rem 0;
    }

    .losses .num {
        text-align: right;
        font-variant-numeric: tabular-nums;
    }

    .losses tr.total td {
        border-top: 1px solid #e5e0d0;
        font-weight: 600;
    }

    .tip-note {
        margin-top: 0.3rem;
        font-size: 0.75rem;
        color: #6b7280;
    }
</style>
