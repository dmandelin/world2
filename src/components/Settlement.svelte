<script>
    import ClanCard from "./ClanCard.svelte";
    import SettlementConsumption from "./SettlementConsumption.svelte";
    import SettlementEconomy from "./SettlementEconomy.svelte";
    import SettlementRelationships from "./SettlementRelationships.svelte";
    import SettlementRites from "./SettlementRites.svelte";
    import SettlementTrade from "./SettlementTrade.svelte";
    import TabbedView from "./TabbedView.svelte";

    let { settlement } = $props();

    const tabs = [
        { label: "Production", snippet: economyTab },
        { label: "Rites", snippet: ritesTab },
        { label: "Relationships", snippet: relationshipsTab },
        { label: "Consumption", snippet: consumptionTab },
        { label: "Trade", snippet: tradeTab },
    ];
</script>

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
    #top {
        margin-left: 1rem;
    }

    h1 {
        margin: 0 0 1rem 0;
    }

    h3, h4 {
        margin: 0.5rem 0;
    }
</style>

<div id="top">
    <div style="display: flex; gap: 1rem; margin-top: 0.25rem">
        <img src="residents.png" alt="Residents" width="150" height="100" />
        <div>
            <h1>{settlement.name}</h1>
            <h3>{settlement.size} people</h3>
        </div>
    </div>

<h4 style="text-align: center; border-bottom: 1px solid grey">The {settlement.clans.length} clans</h4>
<div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
    {#each settlement.clans as clan}
    <ClanCard clan={clan} />
    {/each}
</div>

<TabbedView tabs={tabs} />
</div>