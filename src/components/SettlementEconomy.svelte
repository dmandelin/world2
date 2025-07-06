<script lang="ts">
    import ClanProductionCard from "./ClanProductionCard.svelte";
    import DataTable from "./DataTable.svelte";

    let { settlement } = $props();

    let rows = $derived.by(() => {
        const r = [...settlement.production.goods.entries()].map(([good, value]) => {
            return [good.name, value.toFixed()];
        });
        return r;
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
