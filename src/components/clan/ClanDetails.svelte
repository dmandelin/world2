<script lang="ts">
    import type { ClanDTO } from '../../model/records/dtos';
    import TabbedView from '../TabbedView.svelte';
    import ClanMigrationDetails from './ClanMigrationDetails.svelte';
    import ClanOverviewDetails from './ClanOverviewDetails.svelte';
    import ClanRecentMarriages from './ClanRecentMarriages.svelte';
    import ClanMarriageAppeal from './ClanMarriageAppeal.svelte';
    import ClanMarriageOffers from './ClanMarriageOffers.svelte';
    import ClanNews from './ClanNews.svelte';
    import ClanHistory from '../history/ClanHistory.svelte';
    import { clearRequestedClanTab, uiState } from '../state/uistate.svelte';

    let { clan }: { clan: ClanDTO } = $props();

    const tabs = [
        { label: "Overview", snippet: overviewTab },
        { label: "News", snippet: newsTab },
        { label: "History", snippet: historyTab },
        { label: "Marriage Appeal", snippet: marriageAppealTab },
        { label: "Recent Marriages", snippet: recentMarriagesTab },
        { label: "Marriage Offers", snippet: marriageOffersTab },
        { label: "Migration", snippet: migrationTab },
    ];

    // A link elsewhere can ask for a particular panel, as the clans
    // overview's offers-accepted cells do. Honored once and then cleared.
    let activeIndex = $state(0);
    $effect(() => {
        const wanted = uiState().requestedClanTab;
        if (!wanted) return;
        const i = tabs.findIndex((t) => t.label === wanted);
        if (i >= 0) activeIndex = i;
        clearRequestedClanTab();
    });
</script>

{#snippet overviewTab()}
    <ClanOverviewDetails clan={clan} />
{/snippet}

{#snippet newsTab()}
    <ClanNews clan={clan} />
{/snippet}

{#snippet historyTab()}
    <ClanHistory history={clan.history} clanName={clan.name} />
{/snippet}

{#snippet marriageAppealTab()}
    <ClanMarriageAppeal clan={clan} />
{/snippet}

{#snippet recentMarriagesTab()}
    <ClanRecentMarriages clan={clan} />
{/snippet}

{#snippet marriageOffersTab()}
    <ClanMarriageOffers clan={clan} />
{/snippet}

{#snippet migrationTab()}
    <ClanMigrationDetails clan={clan} />
{/snippet}

<style>
</style>

<TabbedView tabs={tabs} bind:activeIndex />
