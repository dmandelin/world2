<script>
    import SettlementDemographics from "./SettlementDemographics.svelte";
    import SettlementHappiness from "./SettlementHappiness.svelte";
    import SettlementOverview from "./overview/SettlementOverview.svelte";
    import SettlementTrade from "./SettlementTrade.svelte";
    import TabbedView from "./TabbedView.svelte";
    import SettlementRelationships from "./SettlementRelationships.svelte";
    import SettlementRelationshipsGraph from "./SettlementRelationshipsGraph.svelte";
    import SettlementMigrationDetails from "./overview/SettlementMigrationDetails.svelte";
    import SettlementComparison from "./overview/SettlementComparison.svelte";
    import SettlementProductivity from "./SettlementProductivity.svelte";
    import SettlementMutualAid from "./SettlementMutualAid.svelte";

    let { settlement } = $props();

    const tabs = [
        { label: "Overview", snippet: overviewTab },
        { label: "Comparison", snippet: comparisonTab },
        { label: "Relationships", snippet: relationshipsTab },
        { label: "Mutual Aid", snippet: mutualAidTab },
        { label: "Graph", snippet: relationshipsGraphTab },
        { label: "Happiness", snippet: happinessTab },
        { label: "Productivity", snippet: productivityTab },
        { label: "Migration", snippet: migrationTab },
        { label: "Demographics", snippet: demographicsTab },
        { label: "Trade", snippet: tradeTab },
    ];
</script>

{#snippet comparisonTab()}
    <SettlementComparison settlement={settlement} />
{/snippet}

{#snippet migrationTab()}
    <SettlementMigrationDetails settlement={settlement} />
{/snippet}

{#snippet overviewTab()}
    <SettlementOverview settlement={settlement} />
{/snippet}

{#snippet demographicsTab()}
    <SettlementDemographics settlement={settlement} />
{/snippet}

{#snippet tradeTab()}
    <SettlementTrade settlement={settlement} />
{/snippet}

{#snippet happinessTab()}
    <SettlementHappiness settlement={settlement} />
{/snippet}

{#snippet productivityTab()}
    <SettlementProductivity settlement={settlement} />
{/snippet}

{#snippet relationshipsTab()}
    <SettlementRelationships settlement={settlement} />
{/snippet}

{#snippet mutualAidTab()}
    <SettlementMutualAid settlement={settlement} />
{/snippet}

{#snippet relationshipsGraphTab()}
    <SettlementRelationshipsGraph settlement={settlement} />
{/snippet}

<TabbedView tabs={tabs} /> 