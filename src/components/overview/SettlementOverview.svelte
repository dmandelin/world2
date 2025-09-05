<script lang="ts">
    import type { SettlementDTO } from "../dtos";
    import SettlementEconomyOverview from "./SettlementEconomyOverview.svelte";
    import SettlementPopulationOverview from "./SettlementPopulationOverview.svelte";

	let { settlement }: { settlement: SettlementDTO } = $props();
</script>

<SettlementPopulationOverview settlement={settlement} />
<SettlementEconomyOverview settlement={settlement} />

<h3>Issues, happiness, and migration interest</h3>
Placeholder