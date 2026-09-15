<script lang="ts">
    // What each clan here remembers of its past, clan by clan. Clans that came
    // out of one another, or lived through the same flood, hold their own
    // tellings; nothing here merges them.
    import type { ClanDTO, SettlementDTO } from "../model/records/dtos";
    import { sortedByKey } from "../model/lib/basics";
    import ClanHistory from "./history/ClanHistory.svelte";
    import EntityLink from "./state/EntityLink.svelte";

    let { settlement }: { settlement: SettlementDTO } = $props();

    let showModel = $state(false);

    let clans = $derived(
        sortedByKey(settlement.clans, (c: ClanDTO) => c.name),
    );
</script>

<div class="wrap">
    <header>
        <label class="toggle">
            <input type="checkbox" bind:checked={showModel} />
            Show model details
        </label>
    </header>

    {#if clans.length === 0}
        <div class="empty">No clans here.</div>
    {:else}
        <div class="clans">
            {#each clans as clan (clan.uuid)}
                <section class="clan">
                    <h4><EntityLink entity={clan} /></h4>
                    <ClanHistory
                        history={clan.history}
                        clanName={clan.name}
                        {showModel}
                    />
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
        align-items: baseline;
        gap: 1rem;
    }

    .toggle {
        font-size: 0.82rem;
        color: #4b5563;
        cursor: pointer;
    }

    .empty {
        color: #6b7280;
        font-style: italic;
    }

    .clans {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(24rem, 1fr));
        gap: 1rem;
        align-items: start;
    }

    .clan {
        background: #fbfaf5;
        border: 1px solid #e5e0d0;
        border-radius: 4px;
        padding: 0.6rem 0.8rem 0.8rem;
        min-width: 0;
    }

    h4 {
        margin: 0 0 0.5rem;
        font-size: 1rem;
    }
</style>
