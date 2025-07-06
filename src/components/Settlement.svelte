<script>
    import SettlementConsumption from "./SettlementConsumption.svelte";
    import SettlementEconomy from "./SettlementEconomy.svelte";
    import SettlementPeople from "./SettlementPeople.svelte";
    import SettlementRelationships from "./SettlementRelationships.svelte";
    import SettlementRites from "./SettlementRites.svelte";
    import SettlementTrade from "./SettlementTrade.svelte";
    import TabbedView from "./TabbedView.svelte";

    let { settlement } = $props();

    const tabs = [
        { label: "People", snippet: peopleTab },
        { label: "Relationships", snippet: relationshipsTab },
        { label: "Quality of Life", snippet: consumptionTab },
        { label: "Rites", snippet: ritesTab },
        { label: "Production", snippet: economyTab },
        { label: "Trade", snippet: tradeTab },
    ];
</script>

{#snippet peopleTab()}
    <SettlementPeople settlement={settlement} />
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

{#snippet consumptionTab()}
    <SettlementConsumption settlement={settlement} />
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