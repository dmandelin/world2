<script lang="ts">
    import type { ClanDTO } from '../../model/records/dtos';
    import TabbedView from '../TabbedView.svelte';
    import ClanMigrationDetails from './ClanMigrationDetails.svelte';
    import ClanOverviewDetails from './ClanOverviewDetails.svelte';
    import ClanRecentMarriages from './ClanRecentMarriages.svelte';
    import ClanMarriageAppeal from './ClanMarriageAppeal.svelte';

    let { clan }: { clan: ClanDTO } = $props();

    const tabs = [
        { label: "Overview", snippet: overviewTab },
        { label: "Marriage Appeal", snippet: marriageAppealTab },
        { label: "Recent Marriages", snippet: recentMarriagesTab },
        { label: "Migration", snippet: migrationTab },
    ];
</script>

{#snippet overviewTab()}
    <ClanOverviewDetails clan={clan} />
{/snippet}

{#snippet marriageAppealTab()}
    <ClanMarriageAppeal clan={clan} />
{/snippet}

{#snippet recentMarriagesTab()}
    <ClanRecentMarriages clan={clan} />
{/snippet}

{#snippet migrationTab()}
    <ClanMigrationDetails clan={clan} />
{/snippet}

<style>
</style>

<TabbedView tabs={tabs} /> 