<script lang="ts">
    import { pct } from "../model/lib/format";
    import { type ClanDTO } from "./dtos";
    import { buildRespectTable, buildRespectTooltip } from "./tablebuilders";
    import TableView from "./TableView.svelte";

    let { settlement } = $props();
</script>

<style>
</style>

{#snippet respectCellToolTip(clan: ClanDTO, targetClan: ClanDTO)}
  {pct(clan.respect.get(targetClan.ref)?.informationLevel ?? 0)} informed
  <TableView table={buildRespectTooltip(clan, targetClan)}></TableView>
{/snippet}

<div style="display: flex; flex-direction: column; align-items: flex-start; gap: 1rem;">
    <h3>Respect</h3>
    <TableView table={buildRespectTable(settlement, respectCellToolTip)}></TableView>
</div>