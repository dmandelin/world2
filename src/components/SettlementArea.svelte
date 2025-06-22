<script>
    import { signed } from "../model/format";
    import ClanCard from "./ClanCard.svelte";
    import Settlement from "./Settlement.svelte";
    import SettlementConsumption from "./SettlementConsumption.svelte";
    import SettlementEconomy from "./SettlementEconomy.svelte";
    import SettlementRelationships from "./SettlementRelationships.svelte";
    import SettlementRites from "./SettlementRites.svelte";
    import SettlementTrade from "./SettlementTrade.svelte";
    import TabbedView from "./TabbedView.svelte";

    let { settlement } = $props();
</script>

<style>
    #top {
        margin-left: 1rem;
    }

    h1 {
        margin: 0 0 1rem 0;
    }

    h4 {
        margin: 0.5rem 0;
    }
</style>

<div id="top">
    <div style="display: flex; gap: 1rem; margin-top: 0.25rem">
        <img src="residents.png" alt="Residents" width="150" height="100" />
        <div>
            <h1>{settlement.name} &centerdot; 
                {settlement.size}👥 &centerdot; 
                {signed(settlement.averageQoL, 0)}☺</h1>
        </div>
    </div>

    <Settlement settlement={settlement} />
</div>