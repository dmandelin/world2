<script>
    import ClanCard from "./ClanCard.svelte";
    import SettlementEconomy from "./SettlementEconomy.svelte";
    import TabbedView from "./TabbedView.svelte";

    let { settlement } = $props();

    const tabs = [
        { label: "Production", snippet: economyTab },
        { label: "Relationships", snippet: relationshipsTab }
    ];
</script>

{#snippet economyTab()}
    <SettlementEconomy settlement={settlement} />
{/snippet}

{#snippet relationshipsTab()}
RELATIONSHIPS
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
<h1>{settlement.name}</h1>
<h3>{settlement.size} people</h3>

<h4 style="text-align: center; border-bottom: 1px solid grey">The {settlement.clans.length} clans</h4>
<div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
    {#each settlement.clans as clan}
    <ClanCard clan={clan} />
    {/each}
</div>

<TabbedView tabs={tabs} />
</div>