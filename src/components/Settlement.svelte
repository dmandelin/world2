<script>
    import SettlementDemographics from "./SettlementDemographics.svelte";
    import SettlementInformation from "./SettlementInformation.svelte";
    import SettlementTraits from "./SettlementTraits.svelte";
    import SettlementOverview from "./overview/SettlementOverview.svelte";
    import SettlementTrade from "./SettlementTrade.svelte";
    import TabbedView from "./TabbedView.svelte";
    import SettlementRelationships from "./SettlementRelationships.svelte";
    import SettlementRelationshipsGraph from "./SettlementRelationshipsGraph.svelte";
    import SettlementRelationshipsGraph2 from "./SettlementRelationshipsGraph2.svelte";
    import SettlementMigrationDetails from "./overview/SettlementMigrationDetails.svelte";
    import SettlementComparison from "./overview/SettlementComparison.svelte";
    import SettlementProductivity from "./SettlementProductivity.svelte";
    import SettlementMutualAid from "./SettlementMutualAid.svelte";
    import SettlementMarriages from "./SettlementMarriages.svelte";
    import SettlementRedistribution from "./SettlementRedistribution.svelte";
    import SettlementEcon from "./SettlementEcon.svelte";
    import SettlementQoL from "./SettlementQoL.svelte";

    let { settlement } = $props();

    const tabs = [
        { label: "Overview", snippet: overviewTab },
        { label: "Demographics", snippet: demographicsTab },
        { label: "Information", snippet: informationTab },
        { label: "Traits", snippet: traitsTab },
        { label: "QoL", snippet: qolTab },
        { label: "Comparison", snippet: comparisonTab },
        { label: "Econ", snippet: econTab },
        { label: "Relationships", snippet: relationshipsTab },
        { label: "Marriages", snippet: marriagesTab },
        { label: "Redistribution", snippet: redistributionTab },
        { label: "Mutual Aid", snippet: mutualAidTab },
        { label: "Graph", snippet: relationshipsGraphTab },
        { label: "Graph2", snippet: relationshipsGraph2Tab },
        { label: "Productivity", snippet: productivityTab },
        { label: "Migration", snippet: migrationTab },
        { label: "Trade", snippet: tradeTab },
    ];
</script>

{#snippet comparisonTab()}
    <SettlementComparison {settlement} />
{/snippet}

{#snippet migrationTab()}
    <SettlementMigrationDetails {settlement} />
{/snippet}

{#snippet overviewTab()}
    <SettlementOverview {settlement} />
{/snippet}

{#snippet econTab()}
    <SettlementEcon {settlement} />
{/snippet}

{#snippet qolTab()}
    <SettlementQoL {settlement} />
{/snippet}

{#snippet demographicsTab()}
    <SettlementDemographics {settlement} />
{/snippet}

{#snippet informationTab()}
    <SettlementInformation {settlement} />
{/snippet}

{#snippet traitsTab()}
    <SettlementTraits {settlement} />
{/snippet}

{#snippet tradeTab()}
    <SettlementTrade {settlement} />
{/snippet}

{#snippet productivityTab()}
    <SettlementProductivity {settlement} />
{/snippet}

{#snippet relationshipsTab()}
    <SettlementRelationships {settlement} />
{/snippet}

{#snippet marriagesTab()}
    <SettlementMarriages {settlement} />
{/snippet}

{#snippet redistributionTab()}
    <SettlementRedistribution {settlement} />
{/snippet}

{#snippet mutualAidTab()}
    <SettlementMutualAid {settlement} />
{/snippet}

{#snippet relationshipsGraphTab()}
    <SettlementRelationshipsGraph {settlement} />
{/snippet}

{#snippet relationshipsGraph2Tab()}
    <SettlementRelationshipsGraph2 {settlement} />
{/snippet}

<TabbedView {tabs} />
