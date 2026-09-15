<script lang="ts">
    // The settlement's remembered past: every event any clan here remembers,
    // listed once, with how many clans remember it.
    //
    // Clans that lived through the same thing, or came out of one another,
    // share an event but each hold their own telling. The listing shows one
    // telling -- the first chosen clan's, by name -- and folds the rest away
    // beneath it, since they may have drifted apart.
    import type { ClanDTO, SettlementDTO } from "../model/records/dtos";
    import { sortedByKey } from "../model/lib/basics";
    import {
        groupHistory,
        historyEventKey,
        timeframeTooltip,
        type AnyHistoryItem,
    } from "../model/people/history";
    import HistoryItemView from "./history/HistoryItemView.svelte";
    import HistoryDetailToggle from "./history/HistoryDetailToggle.svelte";
    import { historyDetailState } from "./history/historydetail.svelte";

    let { settlement }: { settlement: SettlementDTO } = $props();

    let detail = $derived(historyDetailState.level);

    // Clans left out of the listing. Kept as exclusions rather than choices so
    // a clan new to the settlement is listed without anyone having to tick it.
    let excluded = $state(new Set<string>());

    let pickerOpen = $state(false);
    let picker = $state<HTMLElement>();

    let clans = $derived(
        sortedByKey(settlement.clans, (c: ClanDTO) => c.name),
    );
    let chosen = $derived(clans.filter((c) => !excluded.has(c.uuid)));

    type Rememberer = { clan: ClanDTO; item: AnyHistoryItem };
    type SettlementEvent = { key: string; rememberers: Rememberer[] };

    // Every event anyone here remembers, with each clan's copy of it, in
    // clan-name order.
    let events = $derived.by(() => {
        const byKey = new Map<string, SettlementEvent>();
        for (const clan of clans) {
            for (const item of clan.history.items) {
                const key = historyEventKey(item);
                let event = byKey.get(key);
                if (!event) {
                    event = { key, rememberers: [] };
                    byKey.set(key, event);
                }
                event.rememberers.push({ clan, item });
            }
        }
        return [...byKey.values()];
    });

    // Events any chosen clan remembers, each told as the first of those clans
    // tells it, and laid out newest first by that telling.
    let groups = $derived.by(() => {
        const rows = events.flatMap((event) => {
            const teller = event.rememberers.find(
                (r) => !excluded.has(r.clan.uuid),
            );
            return teller ? [{ event, teller }] : [];
        });
        return groupHistory(rows, (r) => ({
            item: r.teller.item,
            history: r.teller.clan.history,
        }));
    });

    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

    let selectionLabel = $derived(
        chosen.length === clans.length
            ? "All clans"
            : chosen.length === 0
              ? "No clans"
              : chosen.length === 1
                ? chosen[0].name
                : `${chosen.length} of ${clans.length} clans`,
    );

    function toggle(uuid: string) {
        const next = new Set(excluded);
        if (next.has(uuid)) next.delete(uuid);
        else next.add(uuid);
        excluded = next;
    }

    function toggleAll() {
        excluded =
            chosen.length === clans.length
                ? new Set(clans.map((c) => c.uuid))
                : new Set();
    }

    function only(uuid: string) {
        excluded = new Set(
            clans.filter((c) => c.uuid !== uuid).map((c) => c.uuid),
        );
    }

    function closePickerOnOutsideClick(e: MouseEvent) {
        if (pickerOpen && picker && !picker.contains(e.target as Node)) {
            pickerOpen = false;
        }
    }

    const names = (rs: Rememberer[]) => rs.map((r) => r.clan.name).join(", ");
    const clanCount = (n: number) => `${n} ${n === 1 ? "clan" : "clans"}`;
</script>

<svelte:window onclick={closePickerOnOutsideClick} />

<div class="wrap">
    <header>
        <details class="picker" bind:open={pickerOpen} bind:this={picker}>
            <summary>Remembered by: <b>{selectionLabel}</b></summary>
            <div class="menu">
                <label class="row all">
                    <span>
                        <input
                            type="checkbox"
                            checked={chosen.length === clans.length}
                            onchange={toggleAll}
                        />
                        All clans
                    </span>
                </label>
                {#each clans as clan (clan.uuid)}
                    <div class="row">
                        <label>
                            <input
                                type="checkbox"
                                checked={!excluded.has(clan.uuid)}
                                onchange={() => toggle(clan.uuid)}
                            />
                            {clan.name}
                        </label>
                        <button
                            type="button"
                            class="only"
                            onclick={() => only(clan.uuid)}>only</button
                        >
                    </div>
                {/each}
            </div>
        </details>
        <HistoryDetailToggle />
    </header>

    {#if clans.length === 0}
        <div class="empty">No clans here.</div>
    {:else if chosen.length === 0}
        <div class="empty">Choose at least one clan whose memories to list.</div>
    {:else if groups.length === 0}
        <div class="empty">Nothing remembered yet.</div>
    {:else}
        <div class="history detail-{detail}">
            {#each groups as { tf, whens } (tf.key)}
                <section class="group">
                    <h4 title={timeframeTooltip(tf)}>{tf.label}</h4>
                    {#each whens as w (w.level)}
                    <div class="when-group">
                    <div class="when" title={cap(w.def.range)}>
                        {cap(w.def.label)}
                    </div>
                    <ul>
                        {#each w.entries as { event, teller } (event.key)}
                            {@const n = event.rememberers.length}
                            {@const others = event.rememberers.filter(
                                (r) => r !== teller,
                            )}
                            <li>
                                <HistoryItemView
                                    item={teller.item}
                                    history={teller.clan.history}
                                    clanName={teller.clan.name}
                                    {detail}
                                    showWhen={false}
                                    rememberers={event.rememberers.map((r) => ({
                                        clanName: r.clan.name,
                                        item: r.item,
                                    }))}
                                >
                                    {#snippet aside()}
                                        <span
                                            class="count"
                                            class:shared={n > 1}
                                            title="Remembered by {names(
                                                event.rememberers,
                                            )}: {n} of the {clanCount(
                                                clans.length,
                                            )} here"
                                            >{clanCount(n)}</span
                                        >
                                        <span class="names">
                                            {#each event.rememberers as r, i (r.clan.uuid)}<span
                                                    class:teller={n > 1 &&
                                                        r === teller}
                                                    title={n > 1 && r === teller
                                                        ? `The telling shown is the ${r.clan.name}'s`
                                                        : undefined}
                                                    >{r.clan.name}</span
                                                >{i < n - 1 ? ", " : ""}{/each}
                                        </span>
                                    {/snippet}
                                    {#snippet footer()}
                                        <!-- The tellings differ in their words,
                                             which default detail leaves out. -->
                                        {#if others.length > 0 && detail !== "default"}
                                            <details class="tellings">
                                                <summary
                                                    >Other clans' tellings</summary
                                                >
                                                <ul class="others">
                                                    {#each others as other (other.clan.uuid)}
                                                        <li>
                                                            <HistoryItemView
                                                                item={other.item}
                                                                history={other.clan
                                                                    .history}
                                                                clanName={other
                                                                    .clan.name}
                                                                {detail}
                                                            >
                                                                {#snippet aside()}
                                                                    <span
                                                                        class="clan-name"
                                                                        >{other
                                                                            .clan
                                                                            .name}</span
                                                                    >
                                                                {/snippet}
                                                            </HistoryItemView>
                                                        </li>
                                                    {/each}
                                                </ul>
                                            </details>
                                        {/if}
                                    {/snippet}
                                </HistoryItemView>
                            </li>
                        {/each}
                    </ul>
                    </div>
                    {/each}
                </section>
            {/each}
        </div>
    {/if}
</div>

<style>
    .wrap {
        display: flex;
        flex-direction: column;
        gap: 0.8rem;
        padding: 0.25rem 0.25rem 1rem;
    }

    header {
        display: flex;
        align-items: center;
        gap: 1.2rem;
    }

    /* --- clan picker --- */

    .picker {
        position: relative;
    }

    .picker summary {
        list-style: none;
        cursor: pointer;
        font-size: 0.85rem;
        color: #4b5563;
        padding: 0.15rem 0.6rem;
        border: 1px solid #ddd6c0;
        border-radius: 4px;
        background: #fbfaf5;
    }

    .picker summary::-webkit-details-marker {
        display: none;
    }

    .picker summary::after {
        content: " ▾";
        color: #9ca3af;
    }

    .picker summary b {
        color: #1f2328;
    }

    .menu {
        position: absolute;
        z-index: 20;
        top: calc(100% + 0.2rem);
        left: 0;
        min-width: 14rem;
        max-height: 22rem;
        overflow-y: auto;
        background: #fffdf7;
        border: 1px solid #ddd6c0;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
        padding: 0.3rem 0;
        font-size: 0.85rem;
    }

    .row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        padding: 0.1rem 0.6rem;
        cursor: pointer;
    }

    .row label {
        cursor: pointer;
    }

    .row:hover {
        background: #f3edd8;
    }

    .row.all {
        border-bottom: 1px solid #e5e0d0;
        margin-bottom: 0.2rem;
        padding-bottom: 0.25rem;
    }

    .only {
        font: inherit;
        font-size: 0.72rem;
        border: none;
        background: none;
        color: #b8ad8f;
        cursor: pointer;
    }

    .row:hover .only {
        color: #7c2d12;
    }

    .only:hover {
        text-decoration: underline;
    }

    /* --- listing --- */

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
        max-width: 60ch;
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
        gap: 0.75rem;
    }

    /* One line an event, so give the lines room. */
    .detail-default ul {
        gap: 0.4rem;
    }

    .count {
        font-size: 0.72rem;
        color: #4b5563;
        border: 1px solid #ddd6c0;
        border-radius: 999px;
        padding: 0 0.45rem;
        cursor: help;
        font-variant-numeric: tabular-nums;
    }

    .count.shared {
        background: #eef2f7;
        border-color: #b7c6d8;
        color: #334a6b;
    }

    .names {
        font-size: 0.75rem;
        color: #6b7280;
    }

    .names .teller {
        color: #1f2328;
        cursor: help;
    }

    .tellings summary {
        font-size: 0.75rem;
        color: #6b7280;
    }

    .tellings summary {
        cursor: pointer;
        width: fit-content;
    }

    .tellings summary:hover {
        color: #7c2d12;
    }

    ul.others {
        margin: 0.35rem 0 0.3rem 0.2rem;
        padding-left: 0.7rem;
        border-left: 2px solid #e5e0d0;
        gap: 0.55rem;
    }

    .clan-name {
        font-size: 0.72rem;
        font-weight: 600;
        color: #4b5563;
    }
</style>
