<script lang="ts">
    import { buildRespectTable } from "./tablebuilders";
    import TableView from "./TableView.svelte";

    let { settlement } = $props();
</script>

<style>
</style>

<div style="display: flex; flex-direction: column; align-items: flex-start; gap: 1rem;">
    <h3>Respect</h3>
    <TableView table={buildRespectTable(settlement)}></TableView>
</div>