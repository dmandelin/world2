<script>
    import SettlementDemographics from "./SettlementDemographics.svelte";
    import SettlementEconomy from "./SettlementEconomy.svelte";
    import SettlementHappiness from "./SettlementHappiness.svelte";
    import SettlementHealth from "./SettlementHealth.svelte";
    import SettlementPeople from "./SettlementPeople.svelte";
    import SettlementRelationships from "./SettlementRelationships.svelte";
    import SettlementRites from "./SettlementRites.svelte";
    import SettlementTrade from "./SettlementTrade.svelte";
    import TabbedView from "./TabbedView.svelte";

    let { settlement } = $props();

    const tabs = [
        { label: "People", snippet: peopleTab },
        { label: "Demographics", snippet: demographicsTab },
        { label: "Health", snippet: healthTab },
        { label: "Relationships", snippet: relationshipsTab },
        { label: "Happiness", snippet: happinessTab },
        { label: "Rites", snippet: ritesTab },
        { label: "Production", snippet: economyTab },
        { label: "Trade", snippet: tradeTab },
    ];
</script>

{#snippet peopleTab()}
    <SettlementPeople settlement={settlement} />
{/snippet}

{#snippet demographicsTab()}
    <SettlementDemographics settlement={settlement} />
{/snippet}

{#snippet healthTab()}
    <SettlementHealth settlement={settlement} />
{/snippet}

{#snippet economyTab()}
    <SettlementEconomy settlement={settlement} />
{/snippet}

{#snippet ritesTab()}
    <SettlementRites settlement={settlement} />
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

<style>
    h4 {
        margin: 0.5rem 0;
    }
</style>

<TabbedView tabs={tabs} /> 