<script lang="ts">
    // Shows the clan's production out of the settlement economy.

    import DataTable from "./DataTable.svelte";

    let { clan } = $props();

    let rows = $derived.by(() => {
        const r = [...clan.production.goods.entries()].map(([good, value]) => {
            return [good.name, value.toFixed()];
        });
        return r;
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
    <DataTable rows={rows} />
</div>