<script lang="ts">
    // Shows the clan's production out of the settlement economy.

    import DataTable from "./DataTable.svelte";
    import type { ProductionItemDTO } from "./dtos";

    let { clan } = $props();

    let rows = $derived.by(() => {
        const r = clan.production.goods.map((item: ProductionItemDTO) => {
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
        background-color: #f3edd8;
        border: 1px solid #62531d;
        border-radius: 5px;
        padding: 0.25rem;

        width: 180px;
    }
</style>

<div id="top">
    <div style:color={clan.color} style:font-weight="bold" style:text-align="center">{clan.name}</div>
    <DataTable rows={rows} />
</div>