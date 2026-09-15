<script lang="ts">
    // One clan's history as the clan tells it, newest first: grouped by how
    // far back it lies, then by when the clan says it happened, each story in
    // the voice its age calls for.
    import {
        groupHistory,
        timeframeTooltip,
        type History,
    } from "../../model/people/history";
    import HistoryItemView from "./HistoryItemView.svelte";
    import HistoryDetailToggle from "./HistoryDetailToggle.svelte";
    import { historyDetailState } from "./historydetail.svelte";

    let {
        history,
        clanName,
    }: {
        history: History;
        clanName: string;
    } = $props();

    let groups = $derived(
        groupHistory(history.items, (item) => ({ item, history })),
    );

    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
</script>

<div class="controls"><HistoryDetailToggle /></div>

{#if groups.length === 0}
    <div class="empty">Nothing remembered yet.</div>
{:else}
    <div class="history detail-{historyDetailState.level}">
        {#each groups as { tf, whens } (tf.key)}
            <section class="group">
                <h4 title={timeframeTooltip(tf)}>{tf.label}</h4>
                {#each whens as w (w.level)}
                    <div class="when-group">
                        <div class="when" title={cap(w.def.range)}>
                            {cap(w.def.label)}
                        </div>
                        <ul>
                            {#each w.entries as item (item.id)}
                                <li>
                                    <HistoryItemView
                                        {item}
                                        {history}
                                        {clanName}
                                        detail={historyDetailState.level}
                                        showWhen={false}
                                    />
                                </li>
                            {/each}
                        </ul>
                    </div>
                {/each}
            </section>
        {/each}
    </div>
{/if}

<style>
    .controls {
        margin-bottom: 0.6rem;
    }

    .empty {
        color: #6b7280;
        font-style: italic;
    }

    .history {
        display: flex;
        flex-direction: column;
        gap: 1.4rem;
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

    .when-group + .when-group {
        margin-top: 1.1rem;
    }

    .when {
        font-weight: 600;
        font-size: 0.85rem;
        color: #1f2328;
        cursor: help;
        width: fit-content;
    }

    ul {
        list-style: none;
        margin: 0.45rem 0 0;
        padding: 0 0 0 0.8rem;
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
    }

    /* One line an item, so give the lines room. */
    .detail-default ul {
        gap: 0.4rem;
    }
</style>
