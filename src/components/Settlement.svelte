<script>
    import SettlementDemographics from "./SettlementDemographics.svelte";
    import SettlementHappiness from "./SettlementHappiness.svelte";
    import SettlementHealth from "./SettlementHealth.svelte";
    import SettlementOverview from "./overview/SettlementOverview.svelte";
    import SettlementPeople from "./SettlementPeople.svelte";
    import SettlementTrade from "./SettlementTrade.svelte";
    import TabbedView from "./TabbedView.svelte";
    import SettlementRelationships from "./SettlementRelationships.svelte";
    import SettlementRelationshipsGraph from "./SettlementRelationshipsGraph.svelte";
    import SettlementMigrationDetails from "./overview/SettlementMigrationDetails.svelte";

    let { settlement } = $props();

    const tabs = [
        { label: "Overview", snippet: overviewTab },
        { label: "People", snippet: peopleTab },
        { label: "Relationships", snippet: relationshipsTab },
        { label: "Graph", snippet: relationshipsGraphTab },
        { label: "Happiness", snippet: happinessTab },
        { label: "Migration", snippet: migrationTab },
        { label: "Demographics", snippet: demographicsTab },
        { label: "Health", snippet: healthTab },
        { label: "Trade", snippet: tradeTab },
    ];
</script>

{#snippet migrationTab()}
    <SettlementMigrationDetails settlement={settlement} />
{/snippet}

{#snippet overviewTab()}
    <SettlementOverview settlement={settlement} />
{/snippet}

{#snippet peopleTab()}
    <SettlementPeople settlement={settlement} />
{/snippet}

{#snippet demographicsTab()}
    <SettlementDemographics settlement={settlement} />
{/snippet}

{#snippet healthTab()}
    <SettlementHealth settlement={settlement} />
{/snippet}

{#snippet tradeTab()}
    <SettlementTrade settlement={settlement} />
{/snippet}

{#snippet happinessTab()}
    <SettlementHappiness settlement={settlement} />
{/snippet}

{#snippet relationshipsTab()}
    <SettlementRelationships settlement={settlement} />
{/snippet}

{#snippet relationshipsGraphTab()}
    <SettlementRelationshipsGraph settlement={settlement} />
{/snippet}

<style>
    h4 {
        margin: 0.5rem 0;
    }
</style>

<TabbedView tabs={tabs} /> 