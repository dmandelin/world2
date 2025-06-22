<script lang="ts">
    import { signed } from "../model/lib/format";
    import ButtonPanel from "./ButtonPanel.svelte";
    import Settlement from "./Settlement.svelte";
    import { SettlementDTO } from "./dtos";

    let { settlement } = $props();
    let selectedSettlement = $state(settlement);
    $effect(() => {
        selectedSettlement = settlement;
    });
</script>

<style>
    #top {
        margin-left: 1rem;
    }

    h1 {
        margin: 0 0 1rem 0;
    }
</style>

<div id="top">
    <div style="display: flex; gap: 1rem; margin-top: 0.25rem">
        <img src="residents.png" alt="Residents" width="150" height="100" />
        <div>
            <h1>{settlement.name} &centerdot; 
                {settlement.population}👥 &centerdot; 
                {signed(settlement.averageQoL, 0)}☺</h1>
            <ButtonPanel config={{
        buttons: settlement.cluster.settlements.map((s: SettlementDTO) => 
        ({ label: s.name, data: s })),
    }} onSelected={(_, data) => { selectedSettlement = data; } } />
        </div>
    </div>

    <Settlement settlement={selectedSettlement} />
</div>