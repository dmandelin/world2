<script lang="ts">
    import type { SettlementDTO } from "../dtos";
    import SettlementEconomyOverview from "./SettlementEconomyOverview.svelte";
    import SettlementIssuesOverview from "./SettlementIssuesOverview.svelte";
    import SettlementPopulationOverview from "./SettlementPopulationOverview.svelte";

	let { settlement }: { settlement: SettlementDTO } = $props();
</script>

<SettlementIssuesOverview settlement={settlement} />
<SettlementPopulationOverview settlement={settlement} />
<SettlementEconomyOverview settlement={settlement} />