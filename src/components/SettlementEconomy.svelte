<script lang="ts">
    import ClanProductionCard from "./ClanProductionCard.svelte";
    import DataTable from "./DataTable.svelte";

    let { settlement } = $props();

    let rows = $derived.by(() => {
        const r = [...settlement.production.goods.values()].map((item) => {
            return [
                item.good.name,
                item.workers.toFixed(), 
                item.tfp.toFixed(2),
                item.amount.toFixed(),
            ];
        });
        return [
            ['Good', 'L', 'P', 'Y'],
            ...r];
    });
</script>

<style>
    #top {
        width: 100%;
    }
</style>

<div style="display: flex; gap: 0.5rem;">
    {#each settlement.clans as clan}
        <ClanProductionCard clan={clan} />
    {/each}
</div>

<div id="top">
    <h3 style="text-align: center;">Totals</h3>
    <DataTable rows={rows} />
</div>
