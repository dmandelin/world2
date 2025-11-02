<script lang="ts">
    import type { ClanDTO } from '../dtos';
    import TabbedView from '../TabbedView.svelte';
    import ClanLaborDetails from './ClanLaborDetails.svelte';
    import ClanMigrationDetails from './ClanMigrationDetails.svelte';
    import ClanOverviewDetails from './ClanOverviewDetails.svelte';

    let { clan }: { clan: ClanDTO } = $props();

    const tabs = [
        { label: "Overview", snippet: overviewTab },
        { label: "Migration", snippet: migrationTab },
        { label: "Labor", snippet: laborTab },
    ];
</script>

{#snippet overviewTab()}
    <ClanOverviewDetails clan={clan} />
{/snippet}

{#snippet migrationTab()}
    <ClanMigrationDetails clan={clan} />
{/snippet}

{#snippet laborTab()}
    <ClanLaborDetails clan={clan} />
{/snippet}

<style>
</style>

<TabbedView tabs={tabs} /> 