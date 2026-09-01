<script>
    import {
        clearRequestedSettlementTab,
        uiState,
    } from "./state/uistate.svelte";
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
    import SettlementInfrastructure from "./SettlementInfrastructure.svelte";
    import SettlementMutualAid from "./SettlementMutualAid.svelte";
    import SettlementMarriages from "./SettlementMarriages.svelte";
    import SettlementRedistribution from "./SettlementRedistribution.svelte";
    import SettlementEcon from "./SettlementEcon.svelte";
    import SettlementQoL from "./SettlementQoL.svelte";
    import SettlementRituals from "./SettlementRituals.svelte";
    import SettlementFestivals from "./SettlementFestivals.svelte";
    import SettlementWaters from "./SettlementWaters.svelte";

    let { settlement } = $props();

    // Grouped: the settlement itself, then everything about how clans relate
    // to each other, then the relationship graphs.
    const tabs = [
        { label: "Clans", icon: "🏵️", snippet: clansTab, group: "settlement" },
        { label: "Demographics", icon: "👥", snippet: demographicsTab, group: "settlement" },
        { label: "Information", icon: "👁️", snippet: informationTab, group: "settlement" },
        { label: "QoL", icon: "😊", snippet: qolTab, group: "settlement" },
        { label: "Econ", icon: "📊", snippet: econTab, group: "settlement" },
        { label: "Productivity", icon: "⚒️", snippet: productivityTab, group: "settlement" },
        { label: "Infrastructure", icon: "🛠️", snippet: infrastructureTab, group: "settlement" },
        { label: "Trade", icon: "🏺", snippet: tradeTab, group: "settlement" },
        { label: "Migration", icon: "🚶", snippet: migrationTab, group: "settlement" },
        { label: "Rituals", icon: "✴", snippet: ritualsTab, group: "settlement" },
        { label: "Festivals", icon: "🎉", snippet: festivalsTab, group: "settlement" },
        { label: "The Waters", icon: "🌊", snippet: watersTab, group: "settlement" },

        { label: "Relationships", icon: "🤝", snippet: relationshipsTab, group: "relations" },
        { label: "Marriages", icon: "💍", snippet: marriagesTab, group: "relations" },
        { label: "Redistribution", icon: "🍲", snippet: redistributionTab, group: "relations" },
        { label: "Mutual Aid", icon: "🤲", snippet: mutualAidTab, group: "relations" },

        { label: "Scatter Plot", icon: "📈", snippet: scatterPlotTab, group: "graphs" },
        { label: "Comparison", icon: "⚖️", snippet: comparisonTab, group: "graphs" },
        { label: "Graph", icon: "🕸️", snippet: relationshipsGraphTab, group: "graphs" },
        { label: "Graph2", icon: "🌐", snippet: relationshipsGraph2Tab, group: "graphs" },
    ];

    // A link elsewhere can ask for a particular panel -- the event feed's
    // notes name the panel their occasion is written up in. Honored once and
    // then cleared, so it opens the panel rather than pinning the view to it.
    let activeIndex = $state(0);
    $effect(() => {
        const wanted = uiState().requestedSettlementTab;
        if (!wanted) return;
        const i = tabs.findIndex((t) => t.label === wanted);
        if (i >= 0) activeIndex = i;
        clearRequestedSettlementTab();
    });
</script>

{#snippet comparisonTab()}
    <SettlementComparison {settlement} />
{/snippet}

{#snippet migrationTab()}
    <SettlementMigrationDetails {settlement} />
{/snippet}

{#snippet infrastructureTab()}
    <SettlementInfrastructure {settlement} />
{/snippet}

{#snippet clansTab()}
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

{#snippet scatterPlotTab()}
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

{#snippet ritualsTab()}
    <SettlementRituals {settlement} />
{/snippet}

{#snippet festivalsTab()}
    <SettlementFestivals {settlement} />
{/snippet}

{#snippet watersTab()}
    <SettlementWaters {settlement} />
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

<TabbedView {tabs} orientation="vertical" bind:activeIndex />
