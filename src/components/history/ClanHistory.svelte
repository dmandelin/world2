<script lang="ts">
    // One clan's history as the clan tells it: grouped by how far back it
    // lies, oldest first, each story in the voice its age calls for. The
    // model's side -- exact years, figures, the Fortune derivation -- is
    // folded away under each item.
    import {
        HISTORY_TIMEFRAMES,
        HISTORY_TIMEFRAME_DEFS,
        WHEN_LEVELS,
        timeframeTooltip,
        type AnyHistoryItem,
        type History,
    } from "../../model/people/history";
    import {
        historyItemTitle,
        tellHistoryItem,
    } from "../../model/people/historytales";
    import { formatYear } from "../../model/records/year";
    import EudaimoniaCalc from "../self/EudaimoniaCalc.svelte";

    let {
        history,
        clanName,
        showModel = false,
    }: {
        history: History;
        clanName: string;
        // Open every item's model details.
        showModel?: boolean;
    } = $props();

    const KIND_ORDER = { origin: 0, flood: 1, fortune: 2 } as const;

    // Oldest first; what happened before anyone was counting leads.
    function chronological(a: AnyHistoryItem, b: AnyHistoryItem): number {
        const ay = a.year ?? -Infinity;
        const by = b.year ?? -Infinity;
        if (ay !== by) return ay - by;
        return KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
    }

    let groups = $derived(
        HISTORY_TIMEFRAMES.toReversed()
            .map((tf) => ({
                tf,
                items: history.items
                    .filter((i) => history.timeframeOf(i) === tf.key)
                    .toSorted(chronological),
            }))
            .filter((g) => g.items.length > 0),
    );

    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    const signed = (x: number, p = 1) =>
        (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(p);
    const pct = (x: number) => (x * 100).toFixed(0) + "%";
</script>

{#if groups.length === 0}
    <div class="empty">Nothing remembered yet.</div>
{:else}
    <div class="history">
        {#each groups as { tf, items } (tf.key)}
            <section class="group {tf.key}">
                <h4 title={timeframeTooltip(tf)}>{tf.label}</h4>
                <ul>
                    {#each items as item (item.id)}
                        {@const age = history.yearsAgo(item)}
                        <li class="item kind-{item.kind}">
                            <div class="head">
                                <span class="when"
                                    >{cap(history.whenLabel(item))}</span
                                >
                                <span class="title"
                                    >{historyItemTitle(item)}</span
                                >
                            </div>
                            <p class="tale">
                                {tellHistoryItem(item, tf.key, clanName)}
                            </p>
                            <details class="model" open={showModel}>
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
                                        <span class="muted"
                                            >as of {formatYear(
                                                history.asOf,
                                            )}</span
                                        >
                                    </dd>
                                    <dt>Clan knows it as</dt>
                                    <dd>
                                        {WHEN_LEVELS[item.when].label}
                                        <span class="muted"
                                            >level {item.when}</span
                                        >
                                    </dd>
                                    <dt>Told as</dt>
                                    <dd class="help" title={timeframeTooltip(tf)}>
                                        {tf.label}
                                    </dd>
                                    <dt>Event</dt>
                                    <dd>
                                        #{item.eventId}
                                        <span class="muted"
                                            >item #{item.id}</span
                                        >
                                    </dd>

                                    {#if item.kind === "origin"}
                                        <dt>Maternal ancestor</dt>
                                        <dd>{item.maternalAncestor}</dd>
                                        <dt>Paternal ancestor</dt>
                                        <dd>{item.paternalAncestor}</dd>
                                        {#if item.split}
                                            <dt>Split</dt>
                                            <dd>
                                                {item.split.role} house;
                                                {item.split.role === "senior"
                                                    ? "cadet"
                                                    : "senior"} is {item
                                                    .split.otherName}
                                            </dd>
                                        {:else}
                                            <dt>Split</dt>
                                            <dd>
                                                none: one of the world's first
                                                clans
                                            </dd>
                                        {/if}
                                    {:else if item.kind === "flood"}
                                        <dt>Flood</dt>
                                        <dd>{item.floodName}</dd>
                                        <dt>Grain lost</dt>
                                        <dd>
                                            {item.cropsLost.toFixed(1)}
                                            <span class="muted"
                                                >{pct(item.foodShareLost)} of the
                                                year's needs</span
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
                                        <dd>{signed(item.fortune)}</dd>
                                        <dt>Record for</dt>
                                        <dd>
                                            {item.polarity}:
                                            {#each item.periods as p, i (p)}
                                                {@const def =
                                                    HISTORY_TIMEFRAME_DEFS.get(p)!}
                                                <span
                                                    class="help"
                                                    title={timeframeTooltip(def)}
                                                    >{def.label.toLowerCase()}</span
                                                >{i < item.periods.length - 1
                                                    ? ", "
                                                    : ""}
                                            {/each}
                                        </dd>
                                    {/if}
                                </dl>
                                {#if item.kind === "fortune"}
                                    <div class="calc">
                                        <EudaimoniaCalc
                                            eudaimonia={item.snapshot}
                                            fortune={true}
                                        />
                                    </div>
                                {/if}
                            </details>
                        </li>
                    {/each}
                </ul>
            </section>
        {/each}
    </div>
{/if}

<style>
    .empty {
        color: #6b7280;
        font-style: italic;
    }

    .history {
        display: flex;
        flex-direction: column;
        gap: 0.8rem;
    }

    h4 {
        margin: 0 0 0.35rem;
        font-size: 0.78rem;
        font-variant: small-caps;
        letter-spacing: 0.05em;
        color: #62531d;
        border-bottom: 1px solid #e5e0d0;
        padding-bottom: 0.15rem;
        cursor: help;
    }

    ul {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
    }

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
    }

    .title {
        font-size: 0.72rem;
        color: #7c2d12;
        background: #f3edd8;
        border-radius: 3px;
        padding: 0 0.35rem;
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

    .muted {
        color: #9ca3af;
        margin-left: 0.3rem;
    }

    .calc {
        margin-top: 0.3rem;
        padding: 0.4rem 0.5rem;
        border: 1px solid #e5e0d0;
        border-radius: 3px;
        width: fit-content;
    }
</style>
