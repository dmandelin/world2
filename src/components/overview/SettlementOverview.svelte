<script lang="ts">
    import type { SettlementDTO } from "../dtos";
    import SettlementPopulationOverview from "./SettlementPopulationOverview.svelte";

	let { settlement }: { settlement: SettlementDTO } = $props();
</script>

<SettlementPopulationOverview settlement={settlement} />

<div>Food info</div>
<div>Migration info</div>