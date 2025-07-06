<script>
    import DataTable from "./DataTable.svelte";
    import Tooltip from "./Tooltip.svelte";

    let { clan } = $props();
</script>

<style>
    #top {
        background-color: #f3edd8;
        border: 1px solid #62531d;
        border-radius: 5px;
        padding: 1rem;
    }
</style>

<div id="top">
    <h3>{clan.name}</h3>
    <h4>Subsistence</h4>
    <DataTable rows={clan.qolCalc.subsistenceTable} />
    <h4>Needs & Satisfaction</h4>
    <DataTable rows={clan.qolCalc.satsTable} />
    <h4>Sources</h4>
    <DataTable rows={clan.qolCalc.itemsTable} />

    <b>Total: {clan.qolCalc.value.toFixed()}</b>
</div>