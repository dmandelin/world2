<script lang="ts">
    import type { SettlementDTO } from "../dtos";
    import SettlementEconomyOverview from "./SettlementEconomyOverview.svelte";
    import SettlementPopulationOverview from "./SettlementPopulationOverview.svelte";

	let { settlement }: { settlement: SettlementDTO } = $props();
</script>

<SettlementPopulationOverview settlement={settlement} />
<SettlementEconomyOverview settlement={settlement} />

<div>Migration info</div>