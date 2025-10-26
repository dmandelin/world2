<script lang="ts">
    import { type ClanDTO } from "./dtos";
    import { buildRespectTable, buildRespectTooltip } from "./tablebuilders";
    import TableView from "./TableView.svelte";

    let { settlement } = $props();
</script>

<style>
</style>

{#snippet respectCellToolTip(clan: ClanDTO, targetClan: ClanDTO)}
  <TableView table={buildRespectTooltip(clan, targetClan)}></TableView>
{/snippet}

<div style="display: flex; flex-direction: column; align-items: flex-start; gap: 1rem;">
    <h3>Respect</h3>
    <TableView table={buildRespectTable(settlement, respectCellToolTip)}></TableView>
</div>