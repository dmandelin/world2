<script lang="ts">
    import type { ClanDTO } from '../../model/records/dtos';
    import TabbedView from '../TabbedView.svelte';
    import ClanMigrationDetails from './ClanMigrationDetails.svelte';
    import ClanOverviewDetails from './ClanOverviewDetails.svelte';

    let { clan }: { clan: ClanDTO } = $props();

    const tabs = [
        { label: "Overview", snippet: overviewTab },
        { label: "Migration", snippet: migrationTab },
    ];
</script>

{#snippet overviewTab()}
    <ClanOverviewDetails clan={clan} />
{/snippet}

{#snippet migrationTab()}
    <ClanMigrationDetails clan={clan} />
{/snippet}

<style>
</style>

<TabbedView tabs={tabs} /> 